// 1. Define Cities using official boundaries instead of buffers
var cityNames = ['New York City', 'Los Angeles'];
var counties = ee.FeatureCollection('TIGER/2018/Counties');

// Filter counties for New York City (5 boroughs) and Los Angeles County
var nycBoroughs = counties.filter(ee.Filter.inList('NAME', ['New York', 'Kings', 'Queens', 'Bronx', 'Richmond']));
var laCounty = counties.filter(ee.Filter.eq('NAME', 'Los Angeles'));

// Merge the city boundaries and add city names
var nyc = ee.Feature(nycBoroughs.geometry().dissolve(), {name: 'New York City'});
var la = ee.Feature(laCounty.geometry(), {name: 'Los Angeles'});
var cities = ee.FeatureCollection([nyc, la]);

var roads = ee.FeatureCollection('TIGER/2016/Roads');

// 2. Landsat LST Processing 
function getLandsatLST(startDate, endDate, geom) {
  var col = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
    .filterDate(startDate, endDate)
    .filterBounds(geom);

  var maskClouds = function(img) {
    var qa = img.select('QA_PIXEL');
    var cloudMask = qa.bitwiseAnd(1 << 3).eq(0);
    return img.updateMask(cloudMask);
  };

  var calcLST = function(img) {
    return img.select('ST_B10')
      .multiply(0.00341802)
      .add(149.0)
      .subtract(273.15)
      .rename('LST')
      .set('system:time_start', img.get('system:time_start'));
  };

  return col.map(maskClouds).map(calcLST);
}

// 3. Enhanced Road Analysis with Metadata (fixed to handle empty timestamp collections)
function analyzeCity(city) {
  var cityName = city.get('name');
  var cityGeom = city.geometry();
  var cityRoads = roads.filterBounds(cityGeom);

  var lstCol = getLandsatLST('2023-06-01', '2023-08-31', cityGeom);
  var lstMean = lstCol.mean().clip(cityGeom);

  var timestamps = lstCol.aggregate_array('system:time_start');
  
  // Fix: Handle empty timestamp collections
  var medianTimestamp = ee.Algorithms.If(
    timestamps.length().gt(0),
    ee.Date(timestamps.sort().get(ee.Number(timestamps.length().divide(2).floor()))),
    ee.Date('2023-07-15') // Default date if no images are available
  );

  var roadStats = lstMean.reduceRegions({
    collection: cityRoads,
    reducer: ee.Reducer.mean(),
    scale: 30
  }).filter(ee.Filter.notNull(['mean']))
    .map(function(f) {
      var geom = f.geometry();
      var coords = geom.centroid().coordinates();
      return f.set({
        'location_id': f.get('LINEARID'),
        'road_name': f.get('FULLNAME'),
        'latitude': coords.get(1),
        'longitude': coords.get(0),
        'gee_derived_temp': f.get('mean'),
        'timestamp': ee.Date(medianTimestamp).format('YYYY-MM-dd'),
        'city': cityName
      });
    });

  return roadStats;
}

// 4. Process all cities (remains the same)
var allRoads = cities.map(analyzeCity).flatten();

// 5. Battery Risk Classification with Updated Thresholds (fixed to ensure integer risk levels)
var batteryRisk = allRoads.map(function(f) {
  var lst = ee.Number(f.get('gee_derived_temp'));

  // EV Battery Risk (Example thresholds in Celsius)
  var evRisk = lst.gt(50).multiply(3)
    .add(lst.gt(40).and(lst.lte(50)).multiply(2))
    .add(lst.gt(30).and(lst.lte(40)).multiply(1))
    .toInt(); // Ensure integer value

  // Regular Car Battery Risk (Example thresholds in Celsius)
  var regularRisk = lst.gt(45).multiply(3)
    .add(lst.gt(35).and(lst.lte(45)).multiply(2))
    .add(lst.gt(25).and(lst.lte(35)).multiply(1))
    .toInt(); // Ensure integer value

  // Aggregate Risk (Maximum of the two)
  var aggregateRisk = ee.Number(evRisk).max(ee.Number(regularRisk));

  return f.set({
    'ev_risk_level': evRisk,
    'regular_risk_level': regularRisk,
    'aggregate_risk_level': aggregateRisk
  });
});

// 6. Convert risk to raster for spatial visualization (Fixed)
var evRiskImage = batteryRisk.reduceToImage({
  properties: ['ev_risk_level'],
  reducer: ee.Reducer.first()
}).rename('ev_risk_index').clip(cities.geometry()).toInt();

var regularRiskImage = batteryRisk.reduceToImage({
  properties: ['regular_risk_level'],
  reducer: ee.Reducer.first()
}).rename('regular_risk_index').clip(cities.geometry()).toInt();

var aggregateRiskImage = batteryRisk.reduceToImage({
  properties: ['aggregate_risk_level'],
  reducer: ee.Reducer.first()
}).rename('aggregate_risk_index').clip(cities.geometry()).toInt();

// 7. Visualization (remains the same)
var riskPalette = ['00FF00', 'FFFF00', 'FFA500', 'FF0000']; // Green-Yellow-Orange-Red
var riskVis = {min: 0, max: 3, palette: riskPalette};

Map.setCenter(-95, 39, 4);
Map.addLayer(evRiskImage, riskVis, 'EV Battery Risk');
Map.addLayer(regularRiskImage, riskVis, 'Regular Car Battery Risk');
Map.addLayer(aggregateRiskImage, riskVis, 'Aggregate Battery Risk');
Map.addLayer(cities.style({color: 'blue', fillColor: '00000000', width: 2}), {}, 'City Boundaries');
Map.addLayer(roads.filterBounds(cities.geometry()).style({color: 'gray', width: 1}), {}, 'Roads');

// 8. Add legend (adapt for each layer if needed) (remains the same)
var legend = ui.Panel({style: {position: 'bottom-right', padding: '8px'}});
legend.add(ui.Label('Battery Risk Levels', {fontWeight: 'bold'}));
[
  {color: '00FF00', label: 'Low (Level 0)'},
  {color: 'FFFF00', label: 'Moderate (Level 1)'},
  {color: 'FFA500', label: 'High (Level 2)'},
  {color: 'FF0000', label: 'Severe (Level 3)'}
].forEach(function(cls) {
  legend.add(
    ui.Panel([
      ui.Label('', {backgroundColor: '#' + cls.color, padding: '8px', margin: '2px'}),
      ui.Label(cls.label, {margin: '4px'})
    ], ui.Panel.Layout.Flow('horizontal'))
  );
});
Map.add(legend);

// 9. Export CSV with all risk levels (remains the same)
Export.table.toDrive({
  collection: batteryRisk,
  description: 'BatteryRiskSpatialIndex',
  fileFormat: 'CSV',
  selectors: [
    'location_id',
    'road_name',
    'latitude',
    'longitude',
    'gee_derived_temp',
    'timestamp',
    'city',
    'ev_risk_level',
    'regular_risk_level',
    'aggregate_risk_level'
  ]
});
