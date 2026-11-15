
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import EsriJSON from "ol/format/EsriJSON";
import type Feature from "ol/Feature";

import {
  MARS_PROJECTION,
  MARS_RADIUS_M,
} from "../config/mars-map";

// Official ArcGIS Feature Service: Jezero geological map
export const MARS_GEOLOGY_SERVICE_URL =
  "https://services.arcgis.com/v01gqwM5QqNysAAi/ArcGIS/rest/services/Jezero_FeatureServiceFromPro/FeatureServer/8";

// Projection used by the geological service
const MARS_MTM_CODE = "MARS:MTM_77_5";

// Mars geographic coordinates: longitude / latitude
proj4.defs(
  "IAU:49900",
  `+proj=longlat +R=${MARS_RADIUS_M} +no_defs`,
);

// Mars Transverse Mercator projection
proj4.defs(
  MARS_MTM_CODE,
  `+proj=tmerc
   +lat_0=0
   +lon_0=77.5
   +k=1
   +x_0=0
   +y_0=0
   +R=${MARS_RADIUS_M}
   +units=m
   +no_defs`,
);

// Register the coordinate transformations in OpenLayers
register(proj4);

export interface MarsGeologyAttributes {
  OBJECTID: number;
  unit: string;
  name: string;
  symbol: string;
  Unit_Description: string;
  Additional_Characteristics: string;
  Unit_Interpretation: string;
}

export async function fetchMarsGeologyFeatures(): Promise<Feature[]> {
  const params = new URLSearchParams({
    where: "1=1",
    outFields:
      "OBJECTID,unit,name,symbol,Unit_Description,Additional_Characteristics,Unit_Interpretation",
    returnGeometry: "true",
    f: "json",
  });

  const response = await fetch(
    `${MARS_GEOLOGY_SERVICE_URL}/query?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      `Geological service error: HTTP ${response.status}`,
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.error.message ?? "ArcGIS geological query failed",
    );
  }

  if (!Array.isArray(data.features)) {
    throw new Error("No geological features were returned");
  }

  if (data.exceededTransferLimit) {
    throw new Error(
      "The geological service returned incomplete data. Pagination is required.",
    );
  }

  // Convert the original Mars MTM coordinates
  // into the geographic projection used by our map.
  const format = new EsriJSON();

  const features = format.readFeatures(data, {
    dataProjection: MARS_MTM_CODE,
    featureProjection: MARS_PROJECTION,
  });

  features.forEach((feature) => {
    const objectId = feature.get("OBJECTID");

    if (objectId !== undefined) {
      feature.setId(String(objectId));
    }
  });

  return features;
}
