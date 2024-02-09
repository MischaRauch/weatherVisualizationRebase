"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl"; // Import Mapbox GL
import "mapbox-gl/dist/mapbox-gl.css"; // Import stylesheet
import * as WeatherLayersClient from 'weatherlayers-gl/client';
import * as WeatherLayers from 'weatherlayers-gl';

const MapComponent = () => {
  const mapContainerRef = useRef(null);

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0],
      zoom: 1,
    });

    // Initialize WeatherLayers after the map loads
    const addWeatherLayer = async () => {
      const client = new WeatherLayersClient.Client({
        accessToken: process.env.NEXT_PUBLIC_WEATHERLAYERS_ACCESS_TOKEN, // Replace with your WeatherLayers access token
        datetimeInterpolate: true,
        //map: map, // Pass the Mapbox map instance
      });
      
      // Add a specific weather layer, for example, 'temperature'
      const datetimeRange = WeatherLayers.offsetDatetimeRange(new Date().toISOString(), 0, 24);
      const dataset = 'gfs/wind_10m_above_ground';
      const {title, unitFormat, attribution, referenceDatetimeRange, palette} = await client.loadDataset(dataset);
      const {datetimes} = await client.loadDatasetSlice(dataset, datetimeRange);
      const datetime = datetimes[0];
      const {image, image2, imageWeight, imageType, imageUnscale, bounds} = await client.loadDatasetData(dataset,datetime);

      // Transform image (a Uint8ClampedArray object) to an actual image
      // Create a canvas element
      const canvas = document.createElement('canvas');
      canvas.width = 1440;
      canvas.height = 721;

      // Get the 2D context of the canvas
      const ctx = canvas.getContext('2d');

      // Create an ImageData object using the canvas context
      let imageData = ctx.createImageData(canvas.width, canvas.height);

      // Copy the imageDataArray into the ImageData object
      imageData.data.set(image);

      // Put the ImageData object onto the canvas
      ctx.putImageData(imageData, 0, 0);

      // Convert the canvas to a data URL
      const imageUrl = canvas.toDataURL();

      // wrap bounds
      const nestedBounds = [
        [bounds[0], bounds[1]], 
        [bounds[2], bounds[3]], 
      ];

      console.log("bounds: ",bounds)
      console.log("nestedBounds: ",nestedBounds);
      console.log("image: ", imageUrl);
      map.addLayer({
        'id': 'weather-layer',
        'type': 'raster',
        'source': {
          'type': 'image',
          'url': imageUrl,
          'coordinates': bounds
        },
        'paint': {
          // Add paint properties if needed
        }
      });
    };

    map.on('load', addWeatherLayer)

    return () => map.remove();
  }, []);

  return (
    <div ref={mapContainerRef} style={{ width: "100%", height: "400px" }} />
  );
};

export default MapComponent;
