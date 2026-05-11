/**
 * Rail4Sight Data Layer — DuckDB WASM + HuggingFace Parquet
 *
 * Architecture:
 *   1. railway.csv uploaded to HuggingFace Dataset Hub as Parquet
 *   2. DuckDB WASM loads in-browser, queries the Parquet file directly
 *      via httpfs extension (no backend required for reads)
 *   3. Results feed the ML model and UI
 *
 * HuggingFace Dataset URL pattern:
 *   https://huggingface.co/datasets/<ORG>/<DATASET>/resolve/main/railway.parquet
 *
 * ⚠️  Replace HF_DATASET_URL with your actual HuggingFace dataset URL
 *     after uploading railway.csv converted to Parquet.
 */

import * as duckdb from "@duckdb/duckdb-wasm";

// ---------------------------------------------------------------------------
// CONFIG — Update this after uploading to HuggingFace
// ---------------------------------------------------------------------------
export const HF_DATASET_URL =
  process.env.NEXT_PUBLIC_HF_DATASET_URL ??
  "https://huggingface.co/datasets/YOUR_ORG/rail4sight/resolve/main/railway.parquet";

// ---------------------------------------------------------------------------
// Singleton DuckDB instance
// ---------------------------------------------------------------------------
let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;
let initialized = false;

async function initDuckDB(): Promise<duckdb.AsyncDuckDBConnection> {
  if (initialized && conn) return conn;

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], {
      type: "text/javascript",
    })
  );

  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  conn = await db.connect();

  // Load httpfs for remote Parquet access
  await conn.query(`INSTALL httpfs; LOAD httpfs;`);
  await conn.query(`SET s3_region='us-east-1';`);

  initialized = true;
  return conn;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export interface RouteStats {
  departure_station: string;
  arrival_destination: string;
  total_journeys: number;
  delayed_journeys: number;
  delay_rate: number;
  avg_delay_minutes: number;
  cancellation_rate: number;
  avg_price: number;
  common_delay_reason: string;
}

export interface HistoricalJourney {
  departure_time: string;
  price: number;
  ticket_type: string;
  journey_status: string;
  delay_minutes: number;
}

/**
 * Fetch route-level stats from HuggingFace Parquet via DuckDB
 */
export async function getRouteStats(
  departure: string,
  arrival: string
): Promise<RouteStats | null> {
  try {
    const connection = await initDuckDB();

    const result = await connection.query(`
      WITH base AS (
        SELECT
          "Departure Station"          AS departure_station,
          "Arrival Destination"        AS arrival_destination,
          "Journey Status"             AS journey_status,
          "Reason for Delay"           AS reason_for_delay,
          "Price"                      AS price,
          epoch_ms(
            CASE
              WHEN "Actual Arrival Time" IS NOT NULL AND "Arrival Time" IS NOT NULL
              THEN (
                CAST(SPLIT_PART("Actual Arrival Time", ':', 1) AS INT) * 60 +
                CAST(SPLIT_PART("Actual Arrival Time", ':', 2) AS INT)
              ) - (
                CAST(SPLIT_PART("Arrival Time", ':', 1) AS INT) * 60 +
                CAST(SPLIT_PART("Arrival Time", ':', 2) AS INT)
              )
              ELSE NULL
            END * 60000
          )                            AS delay_minutes_raw
        FROM read_parquet('${HF_DATASET_URL}')
        WHERE
          "Departure Station" = '${departure}'
          AND "Arrival Destination" = '${arrival}'
      )
      SELECT
        departure_station,
        arrival_destination,
        COUNT(*)                                              AS total_journeys,
        SUM(CASE WHEN journey_status = 'Delayed' THEN 1 ELSE 0 END)  AS delayed_journeys,
        AVG(CASE WHEN journey_status = 'Delayed' THEN 1.0 ELSE 0.0 END) AS delay_rate,
        AVG(CASE WHEN journey_status = 'Delayed' AND delay_minutes_raw > 0
                 THEN delay_minutes_raw ELSE NULL END)        AS avg_delay_minutes,
        AVG(CASE WHEN journey_status = 'Cancelled' THEN 1.0 ELSE 0.0 END) AS cancellation_rate,
        AVG(price)                                            AS avg_price,
        MODE(reason_for_delay)                               AS common_delay_reason
      FROM base
      GROUP BY departure_station, arrival_destination
    `);

    const rows = result.toArray();
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      departure_station: row.departure_station,
      arrival_destination: row.arrival_destination,
      total_journeys: Number(row.total_journeys),
      delayed_journeys: Number(row.delayed_journeys),
      delay_rate: Number(row.delay_rate),
      avg_delay_minutes: Math.round(Number(row.avg_delay_minutes) || 0),
      cancellation_rate: Number(row.cancellation_rate),
      avg_price: Math.round(Number(row.avg_price)),
      common_delay_reason: row.common_delay_reason ?? "Unknown",
    };
  } catch (err) {
    console.error("[DuckDB] getRouteStats error:", err);
    return null;
  }
}

/**
 * Get all unique departure stations (for autocomplete)
 */
export async function getStations(): Promise<string[]> {
  try {
    const connection = await initDuckDB();
    const result = await connection.query(`
      SELECT DISTINCT "Departure Station" AS station
      FROM read_parquet('${HF_DATASET_URL}')
      UNION
      SELECT DISTINCT "Arrival Destination" AS station
      FROM read_parquet('${HF_DATASET_URL}')
      ORDER BY station
    `);
    return result.toArray().map((r) => String(r.station));
  } catch (err) {
    console.error("[DuckDB] getStations error:", err);
    // Fallback to static list while HuggingFace dataset is being set up
    return STATIC_STATIONS;
  }
}

/**
 * Static station list fallback (matches railway.csv)
 */
export const STATIC_STATIONS = [
  "Birmingham New Street",
  "Bristol Temple Meads",
  "Cardiff Central",
  "Coventry",
  "Crewe",
  "Didcot",
  "Doncaster",
  "Durham",
  "Edinburgh",
  "Edinburgh Waverley",
  "Leeds",
  "Leicester",
  "Liverpool Lime Street",
  "London Euston",
  "London Kings Cross",
  "London Paddington",
  "London St Pancras",
  "London Waterloo",
  "Manchester Piccadilly",
  "Nottingham",
  "Nuneaton",
  "Oxford",
  "Peterborough",
  "Reading",
  "Sheffield",
  "Stafford",
  "Swindon",
  "Tamworth",
  "Wakefield",
  "Warrington",
  "Wolverhampton",
  "York",
];
