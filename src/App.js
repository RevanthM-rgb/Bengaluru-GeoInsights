import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import osmtogeojson from "osmtogeojson";
import MarkerClusterGroup from "react-leaflet-cluster"; 
import CustomSearch from "./CustomSearch";
import { LegendWidget, HomeButton } from "./Widgets"; 
import "./App.css"; 
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";

// Basemaps
const basemaps = {
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 19,
  },
  topo: {
    name: "Topographic",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  esri: {
    name: "ESRI Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Earthstar Geographics",
    maxZoom: 19,
  },
  dark: {
    name: "CartoDB Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
    maxZoom: 19,
  },
};

// Basemap Widget
function BasemapWidget({ current, onChange }) {
  const map = useMap();
  const widgetRef = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const control = L.control({ position: "topleft" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-layers leaflet-bar");
      div.innerHTML = '<button title="Basemap Gallery">🌐</button>';
      div.style.cursor = "pointer";
      div.style.width = "34px";
      div.style.height = "34px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.onclick = () => setVisible((v) => !v);
      return div;
    };

    control.addTo(map);
    widgetRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return visible ? (
    <div className="basemap-popup leaflet-control">
      {Object.entries(basemaps).map(([key, layer]) => (
        <div
          key={key}
          className={`basemap-option ${key === current ? "selected" : ""}`}
          onClick={() => {
            onChange(key);
            setVisible(false);
          }}
        >
          {layer.name}
        </div>
      ))}
    </div>
  ) : null;
}

// Bookmarks Widget
function BookmarksWidget() {
  const map = useMap();
  const controlRef = useRef();
  const [visible, setVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [newBookmarkName, setNewBookmarkName] = useState('');

  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem('mapBookmarks');
      if (storedBookmarks) {
        setBookmarks(JSON.parse(storedBookmarks));
      }
    } catch (error) {
      console.error("Error loading bookmarks from localStorage:", error);
    }
  }, []);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('mapBookmarks', JSON.stringify(bookmarks));
    } catch (error) {
      console.error("Error saving bookmarks to localStorage:", error);
    }
  }, [bookmarks]);

  useEffect(() => {
    const control = L.control({ position: "topright" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-layers leaflet-bar");
      div.innerHTML = '<button title="Bookmarks">🔖</button>';
      div.style.cursor = "pointer";
      div.style.width = "34px";
      div.style.height = "34px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.onclick = () => setVisible((v) => !v);
      return div;
    };

    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  const saveCurrentViewAsBookmark = () => {
    if (!newBookmarkName.trim()) {
      const message = "Please enter a name for the bookmark.";
      console.warn(message);
      return;
    }

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const newBookmark = {
      id: Date.now(),
      name: newBookmarkName.trim(),
      center: [currentCenter.lat, currentCenter.lng],
      zoom: currentZoom,
    };

    setBookmarks((prev) => [...prev, newBookmark]);
    setNewBookmarkName('');
    setVisible(false);
  };

  const goToBookmark = (bm) => {
    map.setView(bm.center, bm.zoom);
    setVisible(false);
  };

  const deleteBookmark = (id) => {
    setBookmarks((prev) => prev.filter(bm => bm.id !== id));
  };


  if (!visible) return null;

  return (
    <div className="Bookmark-popup leaflet-control" style={{ top: "40px", right: "50px", width: "200px" }}>
      <h4>Save Current View</h4>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Bookmark Name"
          value={newBookmarkName}
          onChange={(e) => setNewBookmarkName(e.target.value)}
          style={{ width: 'calc(100% - 10px)', padding: '5px' }}
        />
        <button
          onClick={saveCurrentViewAsBookmark}
          style={{ width: '100%', padding: '5px', marginTop: '5px', cursor: 'pointer' }}
        >
          Save
        </button>
      </div>

      <h4>Saved Bookmarks</h4>
      {bookmarks.length === 0 ? (
        <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#555' }}>No bookmarks saved.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, maxHeight: '150px', overflowY: 'auto', borderTop: '1px solid #eee' }}>
          {bookmarks.map((bm) => (
            <li
              key={bm.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <span
                onClick={() => goToBookmark(bm)}
                style={{ cursor: 'pointer', flexGrow: 1, marginRight: '5px' }}
                title="Go to this bookmark"
              >
                {bm.name}
              </span>
              <button
                onClick={() => deleteBookmark(bm.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'red',
                  cursor: 'pointer',
                  fontSize: '1.2em',
                  padding: '0 5px',
                }}
                title="Delete bookmark"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Ward Layer
function WardLayer({ visible, wardData, openPopupFeature }) {
  const geoJsonRef = useRef();

  const style = {
    color: "#0066cc",
    weight: 2,
    fillColor: "#a6d8ff",
    fillOpacity: 0.3,
  };

  const highlight = {
    weight: 3,
    color: "#003366",
    fillOpacity: 0.5,
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    const popupContent = `
      <strong>Ward Name:</strong> ${props.KGISWardName || "N/A"}<br/>
      <strong>Ward No:</strong> ${props.KGISWardNo || "N/A"}<br/>
      <strong>KGIS Ward Code:</strong> ${props.KGISWardCode || "N/A"}<br/>
      <strong>LGD Ward Code:</strong> ${props.LGD_WardCode || "N/A"}<br/>
      <strong>Town Code:</strong> ${props.KGISTownCode || "N/A"}
    `;
    layer.on({
      mouseover: (e) => e.target.setStyle(highlight),
      mouseout: (e) => e.target.setStyle(style),
      click: (e) => {
        layer.bindPopup(popupContent).openPopup(e.latlng);
      },
    });
  };

  useEffect(() => {
    if (openPopupFeature && geoJsonRef.current) {
      geoJsonRef.current.eachLayer((layer) => {
        if (
          layer.feature &&
          layer.feature.properties?.KGISWardName ===
            openPopupFeature.properties?.KGISWardName
        ) {
          const center = layer.getBounds().getCenter();
          const props = layer.feature.properties || {};
          const popupContent = `
            <strong>Ward Name:</strong> ${props.KGISWardName || "N/A"}<br/>
            <strong>Ward No:</strong> ${props.KGISWardNo || "N/A"}<br/>
            <strong>KGIS Ward Code:</strong> ${props.KGISWardCode || "N/A"}<br/>
            <strong>LGD Ward Code:</strong> ${props.LGD_WardCode || "N/A"}<br/>
            <strong>Town Code:</strong> ${props.KGISTownCode || "N/A"}
          `;
          layer.bindPopup(popupContent).openPopup(center);
        }
      });
    }
  }, [openPopupFeature]);

  if (!visible || !wardData) return null;

  return (
    <GeoJSON
      data={wardData}
      style={style}
      onEachFeature={onEachFeature}
      ref={geoJsonRef}
    />
  );
}

// Leaflet-native Tree Layer (for improved performance)
function LeafletTreeLayer({ visible, treeData }) {
  const map = useMap();
  const markerClusterGroupRef = useRef(null);

  const distinctColors = useMemo(() => [
    "#E6194B", "#3CB44B", "#FFE119", "#4363D8", "#F58231",
    "#911EB4", "#46F0F0", "#F032E6", "#BCF60C", "#FABEBE",
    "#008080", "#E6BEFF", "#9A6324", "#FFFAC8", "#AAFFC3",
    "#800000", "#AA6E28", "#FFD700", "#FFC74D", "#90EE90",
    "#C8C8A1", "#000075", "#A9A9A9", "#E0BBE4", "#957DAD"
  ], []);

  const treeColorMap = useMemo(() => {
    const map = {};
    const uniqueTreeNames = new Set();
    treeData?.features?.forEach((feature) => {
      const name = feature.properties?.TreeName?.toLowerCase().trim();
      if (name) {
        uniqueTreeNames.add(name);
      }
    });

    const sortedUniqueTreeNames = Array.from(uniqueTreeNames).sort();

    sortedUniqueTreeNames.forEach((name, index) => {
      map[name] = distinctColors[index % distinctColors.length];
    });
    return map;
  }, [treeData, distinctColors]);

  useEffect(() => {
    // Initialize or clear the marker cluster group
    if (markerClusterGroupRef.current) {
      map.removeLayer(markerClusterGroupRef.current);
      markerClusterGroupRef.current = null;
    }

    if (!visible || !treeData || !treeData.features || treeData.features.length === 0) {
      return;
    }

    // Create a new MarkerClusterGroup instance
    const newMarkerClusterGroup = L.markerClusterGroup({ chunkedLoading: true });
    markerClusterGroupRef.current = newMarkerClusterGroup;

    const markersToAdd = [];
    treeData.features.forEach((feature) => {
      const coords = feature.geometry?.coordinates;
      if (!coords || feature.geometry?.type !== "Point" || coords.length !== 2) {
        return;
      }

      const [lng, lat] = coords;
      const treeName = feature.properties?.TreeName?.toLowerCase().trim() || 'unknown';
      const color = treeColorMap[treeName] || '#2E8B57';
      const icon = L.divIcon({
        className: "custom-tree-icon",
        html: `<div style="
          width: 10px;
          height: 10px;
          background-color: ${color};
          border: 1px solid #333;
          border-radius: 50%;
          opacity: 0.8;
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const props = feature.properties || {};
      const popupContent = `
        <strong>Tree Name:</strong> ${props.TreeName || "N/A"}<br/>
        <strong>Species:</strong> ${props.KGISTreeID || "N/A"}<br/>
        <strong>Ward Name:</strong> ${props.WardNumber || "N/A"}<br/>
        <strong>Location:</strong> ${props.KGISVillageID || "N/A"}
      `;

      const marker = L.marker([lat, lng], { icon: icon });
      marker.bindPopup(popupContent);
      markersToAdd.push(marker);
    });

    // Add all markers to the cluster group at once
    if (markersToAdd.length > 0) {
      newMarkerClusterGroup.addLayers(markersToAdd);
      map.addLayer(newMarkerClusterGroup);
    }

    // Cleanup function: remove the layer when component unmounts or visibility changes
    return () => {
      if (markerClusterGroupRef.current) {
        map.removeLayer(markerClusterGroupRef.current);
        markerClusterGroupRef.current = null;
      }
    };
  }, [visible, treeData, map, treeColorMap]); // Depend on visible, treeData, map, and treeColorMap

  return null; // This component doesn't render any React-Leaflet components directly
}


// School Layer
function SchoolLayer({ visible, schoolData, openPopupFeature }) {
  const markersRef = useRef({});

  const schoolIcon = L.icon({
    iconUrl: "/icons/school.png", // Ensure this path is correct
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -20],
  });

  useEffect(() => {
    if (openPopupFeature && markersRef.current) {
      Object.values(markersRef.current).forEach((marker) => {
        marker.closePopup();
      });
      // The key for school features is just their index as assigned by react-leaflet
      const marker = markersRef.current[openPopupFeature.__key];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [openPopupFeature]);

  if (!visible || !schoolData) return null;

  return (
    <MarkerClusterGroup chunkedLoading>
      {schoolData.features.map((feature, idx) => {
        const coords = feature.geometry?.coordinates;
        if (!coords || feature.geometry?.type !== "Point" || coords.length !== 2)
          return null;

        const [lng, lat] = coords;

        const name =
          feature.properties?.tags?.name ||
          feature.properties?.name ||
          "Unnamed School";

        // Assign a unique key for tracking the marker in the ref
        feature.__key = idx;

        return (
          <Marker
            key={idx}
            position={[lat, lng]}
            icon={schoolIcon}
            ref={(ref) => {
              if (ref) {
                markersRef.current[idx] = ref;
              }
            }}
          >
            <Popup>
              <strong>School:</strong> {name}
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}

// DEM Layer Component
function DEMLayer({ visible }) {
  const map = useMap();
  const geoRasterLayersRef = useRef([]); // Use an array to store multiple layers

  // Define the GeoTIFF files to load
  const demFiles = useMemo(() => [
    { name: "n12e077", url: "/data/NASADEM_HGT_n12e077_elevation.tif" },
    { name: "n13e077", url: "/data/NASADEM_HGT_n13e077_elevation.tif" },
    { name: "n14e077", url: "/data/NASADEM_HGT_n14e077_elevation.tif" }, // Added the new file here
  ], []); // Use useMemo to prevent re-creation on every render

  useEffect(() => {
    // Clear existing layers when visibility changes or component unmounts
    if (geoRasterLayersRef.current.length > 0) {
      geoRasterLayersRef.current.forEach(layer => map.removeLayer(layer));
      geoRasterLayersRef.current = [];
    }

    if (!visible) {
      return;
    }

    const loadGeoRasters = async () => {
      const loadedGeorasters = [];
      let allMins = [];
      let allMaxs = [];

      // First pass: Load all georasters and collect min/max
      for (const file of demFiles) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${file.url}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const georaster = await parseGeoraster(arrayBuffer);

          // Check if georaster.mins and georaster.maxs are arrays and contain numbers
          if (georaster.mins && georaster.mins.length > 0 && typeof georaster.mins[0] === 'number') {
            allMins.push(georaster.mins[0]);
          } else {
            console.warn(`No valid min value found for ${file.name}`);
          }

          if (georaster.maxs && georaster.maxs.length > 0 && typeof georaster.maxs[0] === 'number') {
            allMaxs.push(georaster.maxs[0]);
          } else {
            console.warn(`No valid max value found for ${file.name}`);
          }

          loadedGeorasters.push({ georaster: georaster, name: file.name });
        } catch (error) {
          console.error(`Error loading or parsing DEM data for ${file.name}:`, error);
        }
      }

      if (loadedGeorasters.length === 0 || allMins.length === 0 || allMaxs.length === 0) {
        console.warn("No valid georasters loaded or no min/max values found for DEM rendering.");
        return; // No layers successfully loaded or no valid range to calculate
      }

      // Determine the global min/max across all loaded georasters
      const globalMin = Math.min(...allMins);
      const globalMax = Math.max(...allMaxs);
      const globalRange = globalMax - globalMin;

      // Avoid division by zero if globalRange is 0 (all values are the same)
      const effectiveGlobalRange = globalRange === 0 ? 1 : globalRange;

      loadedGeorasters.forEach(({ georaster }) => {
        // Define a color function for the DEM using global min/max
        const pixelValuesToColorFn = (pixelValues) => {
          const pixelValue = pixelValues[0];
          // Handle no-data values, typically NaN or very low/high values
          // Adjusted to check if pixelValue is a valid number
          if (pixelValue === undefined || pixelValue === null || isNaN(pixelValue)) {
            return null; // Don't render no-data values
          }
          // Optionally, filter out extreme values that might be no-data
          if (pixelValue < -9999 || pixelValue > 9999) { // Adjust this range based on your DEM's actual no-data values
             return null;
          }


          // Normalize the value to a 0-1 range using global min/max
          const normalizedValue = (pixelValue - globalMin) / effectiveGlobalRange;

          // Simple grayscale for elevation
          const shade = Math.floor(normalizedValue * 255);
          // Clamp values to ensure they are within 0-255
          const clampedShade = Math.max(0, Math.min(255, shade));
          return `rgb(${clampedShade}, ${clampedShade}, ${clampedShade})`;
        };

        const geoRasterLayer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 0.7, // Adjust opacity as needed
          pixelValuesToColorFn: pixelValuesToColorFn,
          resolution: 256, // Adjust resolution for performance/detail
        });

        geoRasterLayer.addTo(map);
        geoRasterLayersRef.current.push(geoRasterLayer);
      });
    };

    loadGeoRasters();

    return () => {
      // Cleanup: remove all layers when component unmounts or visibility changes
      if (geoRasterLayersRef.current.length > 0) {
        geoRasterLayersRef.current.forEach(layer => map.removeLayer(layer));
        geoRasterLayersRef.current = [];
      }
    };
  }, [visible, map, demFiles]); // Added demFiles to dependencies to react to changes if array itself was dynamic

  return null;
}


// Layer List Widget
function LayerListWidget({ layers, toggleLayer }) {
  const map = useMap();
  const controlRef = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const control = L.control({ position: "topright" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-layers leaflet-bar");
      div.innerHTML = '<button title="Layers List">📋</button>';
      div.style.cursor = "pointer";
      div.style.width = "34px";
      div.style.height = "34px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.onclick = () => setVisible((v) => !v);
      return div;
    };

    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  if (!visible) return null;

  return (
    <div className="layerlist-popup leaflet-control" style={{ top: "40px", right: "10px" }}>
      {layers.map(({ id, name, visible }) => (
        <div key={id} className="layerlist-option">
          <input
            type="checkbox"
            checked={visible}
            id={`layer-${id}`}
            onChange={() => toggleLayer(id)}
          />
          <label htmlFor={`layer-${id}`}>{name}</label>
        </div>
      ))}
    </div>
  );
}

// Scale Widget
function ScaleWidget() {
  const map = useMap();
  const controlRef = useRef();

  useEffect(() => {
    const scaleControl = L.control.scale({
      position: "bottomleft",
      metric: true,
      imperial: false,
      maxWidth: 150,
    });

    scaleControl.addTo(map);
    controlRef.current = scaleControl;

    return () => {
      map.removeControl(scaleControl);
    };
  }, [map]);

  return null;
}

// Main App Component
export default function App() {
  const [basemap, setBasemap] = useState("osm");
  const [layersVisibility, setLayersVisibility] = useState({
    ward: false,
    schools: true, // Keep schools true for initial visibility
    trees: false,
    dem: false,
  });

  const [wardData, setWardData] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [openPopupFeature, setOpenPopupFeature] = useState(null);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const initialCenter = [12.9716, 77.5946];
  const initialZoom = 12;

  // Effect to load tree data from multiple parts
  useEffect(() => {
    if (!layersVisibility.trees) {
      setTreeData(null); // Clear tree data when layer is turned off
      return;
    }

    const loadTreeDataParts = async () => {
      const allFeatures = [];
      const fetchPromises = [];

      for (let i = 1; i <= 6; i++) {
        const fileName = `/data/tree_census_part_${String(i).padStart(4, '0')}.geojson`;
        fetchPromises.push(
          fetch(fileName)
            .then((res) => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status} for ${fileName}`);
              }
              return res.json();
            })
            .then((data) => {
              if (data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
                allFeatures.push(...data.features);
              } else {
                console.warn(`Invalid GeoJSON structure in ${fileName}`);
              }
            })
            .catch((err) => {
              console.error(`Error loading tree data from ${fileName}:`, err);
            })
        );
      }

      await Promise.all(fetchPromises);
      setTreeData({ type: "FeatureCollection", features: allFeatures });
    };

    loadTreeDataParts();
  }, [layersVisibility.trees]);


  // Effect to load ward boundary data
  useEffect(() => {
    fetch("/data/ward-boundaries.geojson")
      .then((res) => res.json())
      .then(setWardData)
      .catch((err) => console.error("Error loading ward data", err));
  }, []); // Empty dependency array means this runs once on mount

  // Effect to load school data from Overpass API
  useEffect(() => {
    if (!layersVisibility.schools) {
      setSchoolData(null); // Clear state when layer is turned off
      return;
    }

    const overpassQuery = `
      [out:json];
      area["name"="Bengaluru"]["admin_level"=8]->.searchArea;
      (
        node["amenity"="school"](area.searchArea);
        way["amenity"="school"](area.searchArea);
        relation["amenity"="school"](area.searchArea);
      );
      out body;
      >;
      out skel qt;
    `;

    const fetchSchools = async () => {
      try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: overpassQuery,
        });
        const json = await res.json();
        const geojson = osmtogeojson(json);
        setSchoolData(geojson); // Update state to trigger re-render
      } catch (error) {
        console.error("Error fetching schools:", error);
      }
    };

    fetchSchools();
  }, [layersVisibility.schools]); // Re-fetch when school layer visibility changes


  const toggleLayer = (layerId) => {
    setLayersVisibility((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));

    // Logic to clear open popup feature when layer visibility changes
    // This is primarily for ward and school layers that use openPopupFeature prop
    if (
      (layerId === "ward" && openPopupFeature?.properties?.KGISWardName) ||
      (layerId === "schools" && openPopupFeature?.geometry?.type === "Point" && !openPopupFeature.__key?.startsWith('tree-'))
      // No need to handle tree layer openPopupFeature here directly,
      // as LeafletTreeLayer manages its own popups directly.
    ) {
      setOpenPopupFeature(null);
    }
  };

  const layers = [
    { id: "ward", name: "Ward Boundaries", visible: layersVisibility.ward },
    { id: "schools", name: "Schools", visible: layersVisibility.schools },
    { id: "trees", name: "Tree Census", visible: layersVisibility.trees },
    { id: "dem", name: "Digital Elevation Model", visible: layersVisibility.dem },
  ];

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <img
            src="https://cdn-icons-png.flaticon.com/512/854/854866.png"
            alt="Geo Icon"
            className="logo"
          />
          <h1>Bengaluru GeoInsights</h1>
        </div>

        <div className="header-right">
          <div className="profile-icon-container">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="User Profile"
              className="profile-icon"
              onClick={() => setShowProfileDetails(!showProfileDetails)}
              title="User Profile"
            />
            {showProfileDetails && (
              <div className="profile-details-popup">
                <h4>User Profile</h4>
                <p><strong>Name:</strong> Revanth Myathari</p>
                <p><strong>Email:</strong> revanth@gmail.com</p>
                <p><strong>Role:</strong> Administrator</p>
                <p><strong>Last Login:</strong> {new Date().toLocaleString()}</p>
                <button onClick={() => setShowProfileDetails(false)}>Close</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: "calc(100vh - 60px)", width: "100%" }}
        maxZoom={20}
      >
        {/* Base Tile Layer */}
        <TileLayer
          attribution={basemaps[basemap].attribution}
          url={basemaps[basemap].url}
          maxZoom={basemaps[basemap].maxZoom}
        />

        {/* Overlay Layers */}
        {/* Use the new LeafletTreeLayer instead of the old TreeLayer */}
        <LeafletTreeLayer
          visible={layersVisibility.trees}
          treeData={treeData}
          // openPopupFeature is not passed here as the layer manages popups internally
        />
        <WardLayer
          visible={layersVisibility.ward}
          wardData={wardData}
          openPopupFeature={
            openPopupFeature?.properties?.KGISWardName ? openPopupFeature : null
          }
        />
        <SchoolLayer
          visible={layersVisibility.schools}
          schoolData={schoolData}
          openPopupFeature={
            openPopupFeature?.geometry?.type === "Point" && !openPopupFeature.__key?.startsWith('tree-') ? openPopupFeature : null
          }
        />

        {/* DEM Layer - conditionally rendered */}
        <DEMLayer
          visible={layersVisibility.dem}
        />


        {/* Map Widgets */}
        <BasemapWidget current={basemap} onChange={setBasemap} />
        <LayerListWidget layers={layers} toggleLayer={toggleLayer} />
        <BookmarksWidget />
        <CustomSearch
          wardsData={wardData}
          schoolsData={schoolData}
          treeData={treeData}
          onSelectFeature={setOpenPopupFeature} // Corrected prop name
        />
        <ScaleWidget />
        <LegendWidget />
        <HomeButton center={initialCenter} zoom={initialZoom} />
      </MapContainer>
    </>
  );
}
