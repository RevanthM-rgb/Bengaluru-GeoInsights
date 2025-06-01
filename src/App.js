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

// Tree Layer
function TreeLayer({ visible, treeData }) {
  const markersRef = useRef({});

  // A list of perceptually distinct colors (can be extended if needed)
  const distinctColors = [
    "#E6194B", "#3CB44B", "#FFE119", "#4363D8", "#F58231",
    "#911EB4", "#46F0F0", "#F032E6", "#BCF60C", "#FABEBE",
    "#008080", "#E6BEFF", "#9A6324", "#FFFAC8", "#AAFFC3",
    "#800000", "#AA6E28", "#FFD700", "#FFC74D", "#90EE90",
    "#C8C8A1", "#000075", "#A9A9A9", "#E0BBE4", "#957DAD"
  ];

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
  }, [treeData]);

  if (!visible || !treeData) return null;

  return (
    <MarkerClusterGroup chunkedLoading>
      {treeData.features.map((feature, idx) => {
        const coords = feature.geometry?.coordinates;
        if (!coords || feature.geometry?.type !== "Point" || coords.length !== 2)
          return null;

        const [lng, lat] = coords;
        const treeName = feature.properties?.TreeName?.toLowerCase().trim() || 'unknown';
        const color = treeColorMap[treeName] || '#2E8B57'; // Fallback to a default green

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

        return (
          <Marker
            key={idx}
            position={[lat, lng]}
            icon={icon}
            ref={(ref) => {
              if (ref) {
                markersRef.current[idx] = ref;
              }
            }}
          >
            <Popup>
              <div dangerouslySetInnerHTML={{ __html: popupContent }} />
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}

// School Layer
function SchoolLayer({ visible, schoolData, openPopupFeature }) {
  const markersRef = useRef({});

  const schoolIcon = L.icon({
    iconUrl: "/icons/school.png",
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -20],
  });

  useEffect(() => {
    if (openPopupFeature && markersRef.current) {
      Object.values(markersRef.current).forEach((marker) => {
        marker.closePopup();
      });
      const key = openPopupFeature.__key;
      const marker = markersRef.current[key];
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

// Define the overlay layers, including the new DEM layer
const overlayLayers = {
  dem: {
    name: "Digital Elevation Model",
    url: "https://planetarycomputer.microsoft.com/api/stac/v1/collections/nasadem/{z}/{x}/{y}.png",
    attribution: "NASADEM via Microsoft Planetary Computer",
    maxZoom: 15,
    minZoom: 0,
  },
};

// Main App Component
export default function App() {
  const [basemap, setBasemap] = useState("osm");
  const [layersVisibility, setLayersVisibility] = useState({
    ward: false,
    schools: true,
    trees: false,
    dem: false,
  });

  const [wardData, setWardData] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [openPopupFeature, setOpenPopupFeature] = useState(null);

  const initialCenter = [12.9716, 77.5946];
  const initialZoom = 12;

  useEffect(() => {
    if (!layersVisibility.trees) {
      setTreeData(null);
      return;
    }

    fetch("/data/tree-census.geojson")
      .then((res) => res.json())
      .then(setTreeData)
      .catch((err) => console.error("Error loading tree data", err));
  }, [layersVisibility.trees]);


  useEffect(() => {
    fetch("/data/ward-boundaries.geojson")
      .then((res) => res.json())
      .then(setWardData);
  }, []);


  useEffect(() => {
    if (!layersVisibility.schools) {
      setSchoolData(null);
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
        setSchoolData(geojson);
      } catch (error) {
        console.error("Error fetching schools:", error);
      }
    };

    fetchSchools();
  }, [layersVisibility.schools]);

  const toggleLayer = (layerId) => {
    setLayersVisibility((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));

    if (
      (layerId === "ward" &&
        openPopupFeature?.properties?.KGISWardName) ||
      (layerId === "schools" &&
        openPopupFeature?.geometry?.type === "Point" && !openPopupFeature.__key?.startsWith('tree-')) ||
      (layerId === "trees" &&
        openPopupFeature?.geometry?.type === "Point" && openPopupFeature.__key?.startsWith('tree-'))
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
        <img
          src="https://cdn-icons-png.flaticon.com/512/854/854866.png"
          alt="Geo Icon"
          className="logo"
        />
        <h1>Bengaluru GeoInsights</h1>
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
        <TreeLayer
          visible={layersVisibility.trees}
          treeData={treeData}
          openPopupFeature={openPopupFeature}
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

        {/* New DEM Layer - conditionally rendered */}
        {layersVisibility.dem && (
          <TileLayer
            attribution={overlayLayers.dem.attribution}
            url={overlayLayers.dem.url}
            maxZoom={overlayLayers.dem.maxZoom}
            minZoom={overlayLayers.dem.minZoom}

          />
        )}

        {/* Map Widgets */}
        <BasemapWidget current={basemap} onChange={setBasemap} />
        <LayerListWidget layers={layers} toggleLayer={toggleLayer} />
        <BookmarksWidget />
        <CustomSearch
          wardsData={wardData}
          schoolsData={schoolData}
          treeData={treeData}
          onSelectFeature={setOpenPopupFeature}
        />
        <ScaleWidget />
        <LegendWidget />
        <HomeButton center={initialCenter} zoom={initialZoom} />
      </MapContainer>
    </>
  );
}