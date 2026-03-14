// Generate SVG path data from Natural Earth 110m world boundaries
// Uses the same equirectangular projection as the live map component
const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

const W = 960, H = 500;

function geoToSvg(lat, lng) {
  const x = ((lng + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return [Math.round(x), Math.round(y)];
}

function ringToPath(ring) {
  return ring.map(([lng, lat], i) => {
    const [x, y] = geoToSvg(lat, lng);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join('') + 'Z';
}

function geometryToPath(geom) {
  if (geom.type === 'Polygon') {
    return geom.coordinates.map(ringToPath).join('');
  } else if (geom.type === 'MultiPolygon') {
    return geom.coordinates.map(poly => poly.map(ringToPath).join('')).join('');
  }
  return '';
}

// Load the world-atlas data
const worldPath = path.resolve(__dirname, '..', 'node_modules', 'world-atlas', 'countries-110m.json');
const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));

// Extract land outline (single merged shape)
const land = topojson.feature(world, world.objects.land);
const landPath = land.features.map(f => geometryToPath(f.geometry)).join('');

// Extract individual country border shapes for detail
const countries = topojson.feature(world, world.objects.countries);
const countryPaths = countries.features.map(f => geometryToPath(f.geometry));

// Generate the TypeScript file
const output = `// Auto-generated world map SVG paths
// Source: Natural Earth 110m (public domain)
// Projection: equirectangular, viewBox 0 0 ${W} ${H}
// Matches geoToSvg() in user-activity/page.tsx

export const WORLD_LAND_PATH = ${JSON.stringify(landPath)};

export const WORLD_COUNTRY_PATHS: string[] = ${JSON.stringify(countryPaths, null, 0)};
`;

const outPath = path.resolve(__dirname, '..', 'src', 'lib', 'worldMapPaths.ts');
fs.writeFileSync(outPath, output, 'utf8');

// Stats
const landSize = (landPath.length / 1024).toFixed(1);
const countriesSize = (JSON.stringify(countryPaths).length / 1024).toFixed(1);
console.log(`Generated ${outPath}`);
console.log(`  Land path: ${landSize} KB`);
console.log(`  Country paths: ${countryPaths.length} countries, ${countriesSize} KB`);
console.log(`  Total: ${((landPath.length + JSON.stringify(countryPaths).length) / 1024).toFixed(1)} KB`);
