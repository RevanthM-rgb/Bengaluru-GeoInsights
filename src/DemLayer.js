// src/DemLayer.js
import React from "react";
import { TileLayer } from "react-leaflet";

export default function DemLayer({ visible }) {
  if (!visible) return null;

  return (
    <TileLayer
      url="https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/NASA/NASADEM_HGT/{z}/{x}/{y}?assets=co_geoid"
      attribution='DEM data from <a href="https://planetarycomputer.microsoft.com/dataset/nasadem">NASADEM via Microsoft Planetary Computer</a>'
    />
  );
}
