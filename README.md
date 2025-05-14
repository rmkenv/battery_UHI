# Urban Road Battery Risk Analysis

## Overview

This repository contains code for analyzing and visualizing the potential risk to vehicle batteries (both electric and regular) due to high land surface temperatures (LST) in urban areas. The analysis uses Google Earth Engine (GEE) to process Landsat imagery and identify areas where road temperatures may pose a risk.  The code focuses on defining city boundaries using official boundaries.

## Features

* **City Definition:** Defines city boundaries using official county boundaries for improved accuracy.
* **Landsat LST Processing:** Calculates land surface temperature (LST) from Landsat 8 and 9 imagery.
* **Road Analysis:** Analyzes LST along road networks within the defined city boundaries.
* **Battery Risk Classification:** Classifies road segments into risk levels (low, moderate, high, severe) for both electric vehicle (EV) and regular car batteries, with adjustable temperature thresholds.
* **Spatial Visualization:** Generates risk maps in GEE, visualizing the spatial distribution of battery risk levels.
* **Data Export:** Exports analysis results as a CSV file, including road information, temperature data, and risk classifications.

## Data Sources

* **Landsat 8 and 9:** Land surface temperature data.
* **TIGER/2018/Counties:** County boundaries for defining city areas.
* **TIGER/2016/Roads:** Road network data.

## Code Description

The code consists of the following main parts:

1.  **City Definition:**
    * Defines cities (New York City and Los Angeles) using official county boundaries.
    * Merges borough boundaries for NYC.

2.  **Landsat LST Processing:**
    * Filters Landsat imagery by date and location.
    * Applies cloud masking.
    * Calculates LST from thermal band.

3.  **Road Analysis:**
    * Analyzes LST for each city.
    * Calculates mean LST for road segments.
    * Extracts road attributes (name, location) and LST values.
    * Handles cases where no Landsat images are available for the given time period.

4.  **Risk Classification:**
    * Classifies road segments into battery risk levels based on LST values.
    * Calculates separate risk levels for EV and regular car batteries.
    * Determines an aggregate risk level.

5.  **Visualization:**
    * Generates LST risk maps for each city.
    * Adds city boundaries and road networks to the map.
    * Creates a legend for the risk levels.

6.  **Data Export:**
    * Exports the analysis results (road data, LST, risk levels) to a CSV file in Google Drive.

## How to Use

1.  **Prerequisites:**
    * A Google Earth Engine account.

2.  **Steps:**
    * Clone this repository.
    * Copy the code into the GEE Code Editor.
    * Modify the `cityNames` variable to include the cities you want to analyze.
    * Adjust the date range in the `getLandsatLST` function.
    * Customize the temperature thresholds for risk classification in the `batteryRisk` function if needed.
    * Run the script in the GEE Code Editor.
    * Visualize the results in the GEE map view.
    * Export the data as a CSV to your Google Drive.

## Output

The script generates the following outputs:

* **GEE Map Layers:**
    * EV Battery Risk Map
    * Regular Car Battery Risk Map
    * Aggregate Battery Risk Map
    * City Boundaries
    * Road Networks
* **CSV File:** A CSV file containing road segment data, LST values, and battery risk classifications.

## Dependencies

* Google Earth Engine (GEE)

## Contributions

Contributions are welcome!  Feel free to submit pull requests or open issues to suggest improvements or report bugs.
