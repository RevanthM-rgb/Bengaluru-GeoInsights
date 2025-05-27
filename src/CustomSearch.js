// CustomSearch.js
import React, { useState, useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function CustomSearch({ wardsData, schoolsData, onSelectFeature }) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const searchableItems = [];

  if (wardsData) {
    wardsData.features.forEach((feature) => {
      const name = feature.properties?.KGISWardName || "Unnamed Ward";
      searchableItems.push({
        type: "Ward",
        name,
        feature,
        latlng: null,
        bounds: L.geoJSON(feature).getBounds(),
      });
    });
  }

  if (schoolsData) {
    schoolsData.features.forEach((feature) => {
      const name =
        feature.properties?.tags?.name ||
        feature.properties?.name ||
        "Unnamed School";
      const coords = feature.geometry?.coordinates;
      if (coords && feature.geometry.type === "Point") {
        searchableItems.push({
          type: "School",
          name,
          feature,
          latlng: [coords[1], coords[0]],
          bounds: null,
        });
      }
    });
  }

  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = searchableItems.filter((item) =>
      item.name.toLowerCase().includes(lowerQuery)
    );
    setResults(filtered.slice(0, 10));
  }, [query]);

  const onSelect = (item) => {
    setQuery("");
    setResults([]);

    if (item.bounds) {
      map.fitBounds(item.bounds, { maxZoom: 15 });
    } else if (item.latlng) {
      map.setView(item.latlng, 17);
    }

    onSelectFeature(item.feature);
  };

  return (
    <div
      className="search-widget leaflet-control"
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 1000,
        backgroundColor: "white",
        padding: "8px",
        borderRadius: "4px",
        boxShadow: "0 0 6px rgba(0,0,0,0.3)",
        width: "250px",
      }}
    >
      <input
        type="text"
        placeholder="Search wards or schools..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "93%",
          padding: "6px 8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
      />
      {results.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: 4,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {results.map((item, i) => (
            <li
              key={i}
              onClick={() => onSelect(item)}
              style={{
                cursor: "pointer",
                padding: "4px 6px",
                borderBottom: "1px solid #eee",
              }}
            >
              <strong>{item.type}:</strong> {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
