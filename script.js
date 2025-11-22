// ============================================================================
// GEOPORTAL BUENAVENTURA - JAVASCRIPT COMPLETO
// Autor: Edinson Christofer Angulo
// ============================================================================

// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://kfvnhisozwdjkxddyskn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmdm5oaXNvendkamt4ZGR5c2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzQ1NTMsImV4cCI6MjA3NTYxMDU1M30.0BUL3RYMkNEnI1s2cvxpkLJDz40VwVaqdLPivzSebjQ';

// VARIABLES GLOBALES
let map;
const layerGroups = {};
let barrios = [];
let todosLosPuntos = {
  bomberos: [],
  salud: [],
  recracion_deporte: [],
  seguridad: [],
  educacion: []
};
let todasLasVias = {
  vias_pav: [],
  vias_sin_pav: []
};
let barrioSeleccionado = null;
let barrioLabels = L.layerGroup();
let clickMarker = null;
let distanceLabels = [];
let currentBasemap = null;
let barrioSeleccionadoLayer = null;
let marcadoresCercanos = [];
let capasOriginales = {};

// CONFIGURACIÓN DE MAPAS BASE
const basemaps = {
  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }),
  satellite: L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '© Google'
  }),
  carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO'
  })
};

// CONFIGURACIÓN DE CATEGORÍAS Y CAPAS
const categorias = {
  territorio: {
    titulo: '🌍 Territorio',
    capas: [
      { nombre: 'barrios', tipo: 'polygon', color: '#3498db', icono: '🏘️', label: 'Barrios' },
      { nombre: 'comunas', tipo: 'polygon', color: '#e67e22', icono: '🗺️', label: 'Comunas' }
    ]
  },
  vias: {
    titulo: '🛣️ Infraestructura Vial',
    capas: [
      { nombre: 'vias_pav', tipo: 'line', color: '#34495e', icono: '🛣️', label: 'Vías Pavimentadas' },
      { nombre: 'vias_sin_pav', tipo: 'line', color: '#95a5a6', icono: '🚧', label: 'Vías Sin Pavimentar' }
    ]
  },
  equipamiento: {
    titulo: '🏢 Equipamiento Urbano',
    capas: [
      { nombre: 'bomberos', tipo: 'point', color: '#e74c3c', icono: '🔥', label: 'Bomberos' },
      { nombre: 'salud', tipo: 'point', color: '#2980b9', icono: '⚕️', label: 'Salud' },
      { nombre: 'recracion_deporte', tipo: 'point', color: '#27ae60', icono: '🌳', label: 'Recreación y Deporte' },
      { nombre: 'seguridad', tipo: 'point', color: '#8e44ad', icono: '👮', label: 'Seguridad' },
      { nombre: 'educacion', tipo: 'point', color: '#f39c12', icono: '🎓', label: 'Educación' }
    ]
  }
};

const todasLasCapas = [];
Object.values(categorias).forEach(cat => {
  todasLasCapas.push(...cat.capas);
});

// ============================================================================
// INICIALIZACIÓN DEL MAPA
// ============================================================================

map = L.map('map', {
  center: [3.8801, -77.0315],
  zoom: 12,
  zoomControl: false
});

currentBasemap = basemaps.osm;
currentBasemap.addTo(map);
barrioLabels.addTo(map);

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// FUNCIONALIDAD MENÚ MÓVIL
const menuToggle = document.getElementById('menu-toggle');
const closeMenu = document.getElementById('close-menu');
const sidebar = document.getElementById('sidebar');
const menuOverlay = document.getElementById('menu-overlay');

if (menuToggle && sidebar && menuOverlay) {
  
  menuToggle.addEventListener('click', function() {
    sidebar.classList.add('open');
    menuOverlay.classList.add('active');
    menuToggle.classList.add('active');
  });
  
  closeMenu.addEventListener('click', function() {
    sidebar.classList.remove('open');
    menuOverlay.classList.remove('active');
    menuToggle.classList.remove('active');
  });
  
  menuOverlay.addEventListener('click', function() {
    sidebar.classList.remove('open');
    menuOverlay.classList.remove('active');
    menuToggle.classList.remove('active');
  });
}

function cerrarSidebarEnMovil() {
  if (window.innerWidth <= 768) {
    setTimeout(() => {
      if (sidebar) sidebar.classList.remove('open');
      if (menuOverlay) menuOverlay.classList.remove('active');
      if (menuToggle) menuToggle.classList.remove('active');
    }, 300);
  }
}

map.on('click', function(e) {
  calcularDistancias(e.latlng);
});

// SELECTOR DE MAPAS BASE
document.querySelectorAll('.basemap-btn').forEach(button => {
  button.addEventListener('click', function() {
    const basemapType = this.dataset.basemap;
    
    if (currentBasemap) {
      map.removeLayer(currentBasemap);
    }
    
    currentBasemap = basemaps[basemapType];
    currentBasemap.addTo(map);
    
    document.querySelectorAll('.basemap-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    this.classList.add('active');
    
    setTimeout(() => {
      currentBasemap.bringToBack();
      Object.values(layerGroups).forEach(layer => {
        layer.bringToFront();
      });
      if (barrioSeleccionadoLayer) {
        barrioSeleccionadoLayer.bringToFront();
      }
    }, 100);
  });
});

document.getElementById('zoom-in').addEventListener('click', function() {
  map.zoomIn();
});

document.getElementById('zoom-out').addEventListener('click', function() {
  map.zoomOut();
});

document.getElementById('clear-selection').addEventListener('click', function() {
  limpiarSeleccion();
});

document.getElementById('clear-distance').addEventListener('click', function() {
  limpiarDistancias();
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function crearIcono(capa) {
  return L.divIcon({
    html: `<div style="font-size:20px;">${capa.icono}</div>`,
    className: 'emoji-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  });
}

function setStatus(msg, color = 'black') {
  document.getElementById('status').innerHTML = msg;
  document.getElementById('status').style.color = color;
}

function obtenerCampos(nombre) {
  const campos = {
    'barrios': '*',
    'comunas': '*',
    'vias_pav': '*',
    'vias_sin_pav': '*',
    'bomberos': '*',
    'recracion_deporte': '*',
    'salud': '*',
    'seguridad': '*',
    'educacion': '*'
  };
  
  return campos[nombre] || '*';
}

function crearPopup(properties, nombreCapa) {
  let html = `<div style="min-width:220px; font-family: 'Inter', sans-serif;">`;
  
  let titulo = nombreCapa.toUpperCase();
  if (nombreCapa.toLowerCase() === 'barrios' && properties.barrio) {
    titulo = properties.barrio;
  } else if (nombreCapa.toLowerCase() === 'comunas' && properties.comuna) {
    titulo = `COMUNA ${properties.comuna}`;
  }
  
  html += `<strong style="font-size: 15px; color: #1e293b; display: block; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #84cc16;">${titulo}</strong>`;
  
  const camposOrdenados = [];
  const camposImportantes = ['barrio', 'comuna', 'poblacion', 'ipm', 'area', 'nombre', 'tipo'];
  
  camposImportantes.forEach(campo => {
    if (properties[campo] !== undefined && properties[campo] !== null) {
      camposOrdenados.push(campo);
    }
  });
  
  for (let key in properties) {
    if (key !== 'geom' && !camposImportantes.includes(key)) {
      camposOrdenados.push(key);
    }
  }
  
  camposOrdenados.forEach(key => {
    if (key === 'barrio' && nombreCapa.toLowerCase() === 'barrios') {
      return;
    }
    if (key === 'comuna' && nombreCapa.toLowerCase() === 'comunas') {
      return;
    }
    
    let valor = properties[key];
    
    if (valor === null || valor === undefined) {
      return;
    } else if (key.toLowerCase().includes('area')) {
      valor = `${parseFloat(valor).toFixed(2)} km²`;
    } else if (key.toLowerCase().includes('poblacion') || key.toLowerCase().includes('población')) {
      valor = parseInt(valor).toLocaleString('es-CO') + ' habitantes';
    } else if (key.toLowerCase() === 'ipm') {
      valor = (parseFloat(valor) * 100).toFixed(2);
    }
    
    let nombreCampo = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    html += `<div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #84cc16;">`;
    html += `<span style="font-weight: 600; color: #475569; font-size: 12px;">${nombreCampo}:</span> `;
    html += `<span style="color: #1e293b; font-size: 13px; font-weight: 500;">${valor}</span>`;
    html += `</div>`;
  });
  
  html += `</div>`;
  return html;
}

function agregarEtiquetaBarrio(geojson, nombreBarrio) {
  try {
    const layer = L.geoJSON(geojson);
    const center = layer.getBounds().getCenter();
    
    const label = L.marker(center, {
      icon: L.divIcon({
        className: 'barrio-label',
        html: nombreBarrio,
        iconSize: null
      })
    });
    
    label.addTo(barrioLabels);
  } catch (e) {
    console.error('Error agregando etiqueta:', e);
  }
}

function estiloRayCasting(point, geojson) {
  let coords = [];
  
  if (geojson.type === 'Polygon') {
    coords = geojson.coordinates[0];
  } else if (geojson.type === 'MultiPolygon') {
    coords = geojson.coordinates[0][0];
  } else {
    return false;
  }
  
  let inside = false;
  const x = point.lng;
  const y = point.lat;
  
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0], yi = coords[i][1];
    const xj = coords[j][0], yj = coords[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

function calcularLongitudSegmento(coordenadas) {
  if (coordenadas.length < 2) return 0;
  
  let longitud = 0;
  
  for (let i = 0; i < coordenadas.length - 1; i++) {
    const [lng1, lat1] = coordenadas[i];
    const [lng2, lat2] = coordenadas[i + 1];
    
    const punto1 = L.latLng(lat1, lng1);
    const punto2 = L.latLng(lat2, lng2);
    
    longitud += punto1.distanceTo(punto2);
  }
  
  return longitud / 1000;
}

function calcularLongitudViaEnBarrio(viaGeojson, barrioGeojson, barrioBounds) {
  let longitudTotal = 0;
  
  try {
    let coordinates = [];
    
    if (viaGeojson.type === 'LineString') {
      coordinates = [viaGeojson.coordinates];
    } else if (viaGeojson.type === 'MultiLineString') {
      coordinates = viaGeojson.coordinates;
    }
    
    coordinates.forEach(lineCoords => {
      let segmentosDentro = [];
      
      lineCoords.forEach((coord, index) => {
        const [lng, lat] = coord;
        const punto = L.latLng(lat, lng);
        
        const estaDentro = barrioBounds.contains(punto) && estiloRayCasting(punto, barrioGeojson);
        
        if (estaDentro) {
          segmentosDentro.push(coord);
        } else {
          if (segmentosDentro.length > 0) {
            longitudTotal += calcularLongitudSegmento(segmentosDentro);
            segmentosDentro = [];
          }
        }
      });
      
      if (segmentosDentro.length > 0) {
        longitudTotal += calcularLongitudSegmento(segmentosDentro);
      }
    });
    
  } catch (e) {
    console.error('Error calculando longitud:', e);
  }
  
  return longitudTotal;
}

// ============================================================================
// GESTIÓN DE CAPAS
// ============================================================================

function crearControles() {
  const container = document.getElementById('layers');
  
  Object.entries(categorias).forEach(([key, categoria]) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'layer-category';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'layer-category-title';
    titleDiv.textContent = categoria.titulo;
    categoryDiv.appendChild(titleDiv);
    
    categoria.capas.forEach(capa => {
      const div = document.createElement('div');
      div.className = 'layer-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `check_${capa.nombre}`;
      checkbox.onchange = () => toggleCapa(capa.nombre, checkbox.checked);
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'layer-icon';
      iconSpan.textContent = capa.icono;
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'layer-name';
      nameSpan.textContent = capa.label;
      
      const colorDiv = document.createElement('div');
      colorDiv.className = 'layer-color';
      colorDiv.style.backgroundColor = capa.color;
      
      div.appendChild(checkbox);
      div.appendChild(iconSpan);
      div.appendChild(nameSpan);
      div.appendChild(colorDiv);
      
      div.onclick = (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          toggleCapa(capa.nombre, checkbox.checked);
        }
      };
      
      categoryDiv.appendChild(div);
    });
    
    container.appendChild(categoryDiv);
  });
}

async function toggleCapa(nombre, mostrar) {
  if (mostrar) {
    await cargarCapa(nombre);
    cerrarSidebarEnMovil();
  } else {
    if (layerGroups[nombre]) {
      map.removeLayer(layerGroups[nombre]);
      delete layerGroups[nombre];
    }
    
    if (nombre === 'barrios') {
      barrioLabels.clearLayers();
    }
    
    setStatus('Capa desactivada', 'gray');
  }
}

async function cargarCapa(nombre) {
  let capa = null;
  Object.values(categorias).forEach(cat => {
    const encontrada = cat.capas.find(c => c.nombre === nombre);
    if (encontrada) capa = encontrada;
  });
  if (!capa) return;
  
  setStatus(`⏳ Cargando ${capa.icono} ${capa.label}...`, '#3498db');
  
  try {
    let url = `${SUPABASE_URL}/rest/v1/${nombre}?select=*`;
    
    let res = await fetch(url, {
      headers: { 
        'apikey': SUPABASE_KEY, 
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Error al cargar datos de "${nombre}": ${res.status} - ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (!data || data.length === 0) {
      throw new Error('No hay datos disponibles en esta capa');
    }
    
    console.log(`${nombre}: Campos disponibles en primer registro:`, Object.keys(data[0]));
    console.log(`${nombre}: Datos del primer registro:`, data[0]);
    
    if (layerGroups[nombre]) {
      map.removeLayer(layerGroups[nombre]);
    }
    
    layerGroups[nombre] = L.layerGroup();
    let contador = 0;
    
    data.forEach(feature => {
      if (!feature.geom) return;
      
      if (nombre === 'barrios' && barrioSeleccionado) {
        if (feature.gid !== barrioSeleccionado.gid) {
          return;
        }
      }
      
      try {
        const geojson = typeof feature.geom === 'string' ? JSON.parse(feature.geom) : feature.geom;
        
        if (geojson.type === 'Point') {
          const [lng, lat] = geojson.coordinates;
          const marker = L.marker([lat, lng], {
            icon: crearIcono(capa)
          });
          marker.bindPopup(crearPopup(feature, capa.label));
          marker.addTo(layerGroups[nombre]);
          contador++;
        } 
        else if (geojson.type === 'LineString' || geojson.type === 'MultiLineString') {
          const layer = L.geoJSON(geojson, {
            style: {
              color: capa.color,
              weight: 3,
              opacity: 0.8
            }
          });
          layer.bindPopup(crearPopup(feature, capa.label));
          layer.addTo(layerGroups[nombre]);
          contador++;
        }
        else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
          const layer = L.geoJSON(geojson, {
            style: {
              color: capa.color,
              weight: 2,
              fillColor: capa.color,
              fillOpacity: 0.3
            }
          });
          layer.bindPopup(crearPopup(feature, capa.label));
          layer.addTo(layerGroups[nombre]);
          contador++;
        }
      } catch (e) {
        console.error(`Error procesando feature:`, e);
      }
    });
    
    if (contador === 0) {
      throw new Error('Sin geometrías válidas');
    }
    
    layerGroups[nombre].addTo(map);
    
    setTimeout(() => {
      if (currentBasemap) {
        currentBasemap.bringToBack();
      }
      layerGroups[nombre].bringToFront();
      if (barrioSeleccionadoLayer) {
        barrioSeleccionadoLayer.bringToFront();
      }
    }, 100);
    
    setStatus(`✅ ${capa.icono} ${capa.label}: ${contador} elementos`, '#27ae60');
    
    if (Object.keys(layerGroups).length === 1 && !barrioSeleccionado) {
      try {
        const bounds = layerGroups[nombre].getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.log('No se pudo ajustar vista');
      }
    }
    
  } catch (err) {
    setStatus(`❌ Error: ${err.message}`, '#e74c3c');
    console.error(`Error completo en ${nombre}:`, err);
    document.getElementById(`check_${nombre}`).checked = false;
  }
}

// ============================================================================
// BÚSQUEDA Y SELECCIÓN DE BARRIOS
// ============================================================================

async function cargarBarriosParaBusqueda() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/barrios?select=gid,barrio,comuna,geom`, {
      headers: { 
        'apikey': SUPABASE_KEY, 
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (res.ok) {
      barrios = await res.json();
      console.log(`${barrios.length} barrios cargados para búsqueda`);
    }
  } catch (err) {
    console.error('Error cargando barrios:', err);
  }
}

function configurarBusqueda() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  
  input.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    
    if (texto.length < 2) {
      results.style.display = 'none';
      return;
    }
    
    const coincidencias = barrios.filter(b => 
      b.barrio && b.barrio.toLowerCase().includes(texto)
    );
    
    if (coincidencias.length === 0) {
      results.innerHTML = '<div class="search-result-item">No se encontraron resultados</div>';
      results.style.display = 'block';
      return;
    }
    
    results.innerHTML = '';
    coincidencias.forEach(barrio => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.textContent = `${barrio.barrio} (Comuna ${barrio.comuna || 'N/A'})`;
      item.onclick = () => seleccionarBarrio(barrio);
      results.appendChild(item);
    });
    
    results.style.display = 'block';
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-container')) {
      results.style.display = 'none';
    }
  });
}

async function seleccionarBarrio(barrio) {
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('search-input').value = barrio.barrio;
  barrioSeleccionado = barrio;
  
  document.getElementById('clear-selection-btn').style.display = 'block';
  
  setStatus(`⏳ Analizando barrio ${barrio.barrio}...`, '#3498db');
  
  await cargarPuntosYViasParaAnalisis();
  
  const stats = analizarBarrioCompleto(barrio);
  
  document.getElementById('barrio-name').textContent = `📍 ${barrio.barrio}`;
  document.getElementById('barrio-stats').innerHTML = `
    <div class="info-section">
      <div class="info-section-title">🏢 Equipamiento Urbano</div>
      <div class="info-item">🔥 Bomberos: ${stats.bomberos}</div>
      <div class="info-item">⚕️ Salud: ${stats.salud}</div>
      <div class="info-item">🌳 Recreación y Deporte: ${stats.recracion_deporte}</div>
      <div class="info-item">👮 Seguridad: ${stats.seguridad}</div>
      <div class="info-item">🎓 Educación: ${stats.educacion}</div>
    </div>
    <div class="info-section">
      <div class="info-section-title">🛣️ Infraestructura Vial</div>
      <div class="info-item">🛣️ Vías Pavimentadas: ${stats.vias_pav_km} km</div>
      <div class="info-item">🚧 Vías Sin Pavimentar: ${stats.vias_sin_pav_km} km</div>
      <div class="info-item">📊 Total Vías: ${stats.total_vias_km} km</div>
    </div>
  `;
  document.getElementById('barrio-info').style.display = 'block';
  
  if (barrioSeleccionadoLayer) {
    map.removeLayer(barrioSeleccionadoLayer);
  }
  
  if (barrio.geom) {
    try {
      const geojson = typeof barrio.geom === 'string' ? JSON.parse(barrio.geom) : barrio.geom;
      
      barrioSeleccionadoLayer = L.geoJSON(geojson, {
        style: {
          color: '#e74c3c',
          weight: 4,
          fillColor: '#e74c3c',
          fillOpacity: 0.3
        }
      });
      barrioSeleccionadoLayer.addTo(map);
      
      map.fitBounds(barrioSeleccionadoLayer.getBounds(), { padding: [50, 50] });
      
      setTimeout(() => {
        if (currentBasemap) {
          currentBasemap.bringToBack();
        }
        barrioSeleccionadoLayer.bringToFront();
      }, 100);
      
    } catch (e) {
      console.error('Error al mostrar barrio:', e);
    }
  }
  
  const checkBarrios = document.getElementById('check_barrios');
  if (checkBarrios && checkBarrios.checked) {
    await cargarCapa('barrios');
  }
  
  cerrarSidebarEnMovil();
  
  setStatus(`✅ Análisis completado para ${barrio.barrio}`, '#27ae60');
}

function limpiarSeleccion() {
  barrioSeleccionado = null;
  
  if (barrioSeleccionadoLayer) {
    map.removeLayer(barrioSeleccionadoLayer);
    barrioSeleccionadoLayer = null;
  }
  
  document.getElementById('search-input').value = '';
  document.getElementById('barrio-info').style.display = 'none';
  document.getElementById('clear-selection-btn').style.display = 'none';
  
  const checkBarrios = document.getElementById('check_barrios');
  if (checkBarrios && checkBarrios.checked) {
    cargarCapa('barrios');
  }
  
  setStatus('✅ Selección limpiada', '#27ae60');
}

// ============================================================================
// ANÁLISIS TERRITORIAL
// ============================================================================

async function cargarPuntosYViasParaAnalisis() {
  const capasParaAnalizar = ['bomberos', 'salud', 'recracion_deporte', 'seguridad', 'educacion'];
  
  for (const nombreCapa of capasParaAnalizar) {
    if (todosLosPuntos[nombreCapa].length === 0) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${nombreCapa}?select=gid,geom`, {
          headers: { 
            'apikey': SUPABASE_KEY, 
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          todosLosPuntos[nombreCapa] = data.filter(d => d.geom);
        }
      } catch (err) {
        console.error(`Error cargando ${nombreCapa}:`, err);
      }
    }
  }

  const viasParaAnalizar = ['vias_pav', 'vias_sin_pav'];
  
  for (const nombreVia of viasParaAnalizar) {
    if (todasLasVias[nombreVia].length === 0) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${nombreVia}?select=gid,geom`, {
          headers: { 
            'apikey': SUPABASE_KEY, 
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          todasLasVias[nombreVia] = data.filter(d => d.geom);
          console.log(`${nombreVia}: ${todasLasVias[nombreVia].length} vías cargadas`);
        } else {
          console.warn(`No se pudo cargar ${nombreVia}, puede que la tabla no exista`);
        }
      } catch (err) {
        console.error(`Error cargando ${nombreVia}:`, err);
      }
    }
  }
}

function analizarBarrioCompleto(barrio) {
  const stats = {
    bomberos: 0,
    salud: 0,
    recracion_deporte: 0,
    seguridad: 0,
    educacion: 0,
    vias_pav_km: 0,
    vias_sin_pav_km: 0,
    total_vias_km: 0
  };
  
  if (!barrio.geom) return stats;
  
  try {
    const barrioGeojson = typeof barrio.geom === 'string' ? JSON.parse(barrio.geom) : barrio.geom;
    const barrioLayer = L.geoJSON(barrioGeojson);
    const barrioBounds = barrioLayer.getBounds();
    
    for (const [tipo, puntos] of Object.entries(todosLosPuntos)) {
      puntos.forEach(punto => {
        try {
          const geojson = typeof punto.geom === 'string' ? JSON.parse(punto.geom) : punto.geom;
          if (geojson.type === 'Point') {
            const [lng, lat] = geojson.coordinates;
            const puntoLatLng = L.latLng(lat, lng);
            
            if (barrioBounds.contains(puntoLatLng)) {
              const dentroDelPoligono = estiloRayCasting(puntoLatLng, barrioGeojson);
              if (dentroDelPoligono) {
                stats[tipo]++;
              }
            }
          }
        } catch (e) {
          console.error('Error procesando punto:', e);
        }
      });
    }
    
    for (const [tipo, vias] of Object.entries(todasLasVias)) {
      vias.forEach(via => {
        try {
          const geojson = typeof via.geom === 'string' ? JSON.parse(via.geom) : via.geom;
          
          if (geojson.type === 'LineString' || geojson.type === 'MultiLineString') {
            const longitud = calcularLongitudViaEnBarrio(geojson, barrioGeojson, barrioBounds);
            
            if (tipo === 'vias_pav') {
              stats.vias_pav_km += longitud;
            } else if (tipo === 'vias_sin_pav') {
              stats.vias_sin_pav_km += longitud;
            }
          }
        } catch (e) {
          console.error('Error procesando vía:', e);
        }
      });
    }
    
    stats.vias_pav_km = parseFloat(stats.vias_pav_km.toFixed(2));
    stats.vias_sin_pav_km = parseFloat(stats.vias_sin_pav_km.toFixed(2));
    stats.total_vias_km = parseFloat((stats.vias_pav_km + stats.vias_sin_pav_km).toFixed(2));
    
  } catch (e) {
    console.error('Error analizando barrio:', e);
  }
  
  return stats;
}

// ============================================================================
// CÁLCULO DE DISTANCIAS
// ============================================================================

async function calcularDistancias(latlng) {
  limpiarDistancias();
  
  clickMarker = L.circleMarker(latlng, {
    radius: 8,
    fillColor: '#ff0000',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(map);
  
  setStatus('⏳ Calculando distancias...', '#3498db');
  
  await cargarPuntosYViasParaAnalisis();
  
  const distancias = {
    bomberos: null,
    salud: null,
    recracion_deporte: null,
    seguridad: null,
    educacion: null
  };
  
  const puntosMasCercanos = {
    bomberos: null,
    salud: null,
    recracion_deporte: null,
    seguridad: null,
    educacion: null
  };
  
  for (const [tipo, puntos] of Object.entries(todosLosPuntos)) {
    let minDistancia = Infinity;
    let puntoMasCercano = null;
    let featureMasCercano = null;
    
    puntos.forEach(punto => {
      try {
        const geojson = typeof punto.geom === 'string' ? JSON.parse(punto.geom) : punto.geom;
        if (geojson.type === 'Point') {
          const [lng, lat] = geojson.coordinates;
          const puntoLatLng = L.latLng(lat, lng);
          const distancia = latlng.distanceTo(puntoLatLng);
          
          if (distancia < minDistancia) {
            minDistancia = distancia;
            puntoMasCercano = { distancia, punto: puntoLatLng };
            featureMasCercano = punto;
          }
        }
      } catch (e) {
        console.error('Error calculando distancia:', e);
      }
    });
    
    if (puntoMasCercano) {
      distancias[tipo] = puntoMasCercano;
      puntosMasCercanos[tipo] = featureMasCercano;
      
      const polyline = L.polyline([latlng, puntoMasCercano.punto], {
        color: '#000000',
        weight: 2,
        opacity: 0.7,
        dashArray: '8, 12'
      }).addTo(map);
      distanceLabels.push(polyline);
    }
  }
  
  const capasEquipamiento = ['bomberos', 'salud', 'recracion_deporte', 'seguridad', 'educacion'];
  
  capasEquipamiento.forEach(nombreCapa => {
    const checkbox = document.getElementById(`check_${nombreCapa}`);
    
    if (checkbox && checkbox.checked) {
      if (layerGroups[nombreCapa] && !capasOriginales[nombreCapa]) {
        capasOriginales[nombreCapa] = layerGroups[nombreCapa];
      }
      
      if (layerGroups[nombreCapa]) {
        map.removeLayer(layerGroups[nombreCapa]);
      }
      
      if (puntosMasCercanos[nombreCapa]) {
        let capa = null;
        Object.values(categorias).forEach(cat => {
          const encontrada = cat.capas.find(c => c.nombre === nombreCapa);
          if (encontrada) capa = encontrada;
        });
        
        if (capa) {
          const nuevoLayerGroup = L.layerGroup();
          const feature = puntosMasCercanos[nombreCapa];
          
          try {
            const geojson = typeof feature.geom === 'string' ? JSON.parse(feature.geom) : feature.geom;
            if (geojson.type === 'Point') {
              const [lng, lat] = geojson.coordinates;
              const marker = L.marker([lat, lng], {
                icon: crearIcono(capa)
              });
              marker.bindPopup(crearPopup(feature, capa.label));
              marker.addTo(nuevoLayerGroup);
              marcadoresCercanos.push(marker);
            }
          } catch (e) {
            console.error('Error creando marcador cercano:', e);
          }
          
          layerGroups[nombreCapa] = nuevoLayerGroup;
          nuevoLayerGroup.addTo(map);
        }
      }
    }
  });
  
  mostrarDistancias(distancias, latlng);
  
  setStatus('✅ Distancias calculadas - Mostrando equipamientos más cercanos', '#27ae60');
}

function mostrarDistancias(distancias, latlng) {
  const iconos = {
    bomberos: '🔥',
    salud: '⚕️',
    recracion_deporte: '🌳',
    seguridad: '👮',
    educacion: '🎓'
  };
  
  const nombres = {
    bomberos: 'Bomberos',
    salud: 'Salud',
    recracion_deporte: 'Recreación y Deporte',
    seguridad: 'Seguridad',
    educacion: 'Educación'
  };
  
  let html = '';
  
  for (const [tipo, data] of Object.entries(distancias)) {
    if (data) {
      const distanciaKm = (data.distancia / 1000).toFixed(2);
      const distanciaM = data.distancia.toFixed(0);
      const texto = data.distancia >= 1000 ? `${distanciaKm} km` : `${distanciaM} m`;
      
      html += `<div class="distance-item">${iconos[tipo]} ${nombres[tipo]}: <strong>${texto}</strong></div>`;
    } else {
      html += `<div class="distance-item">${iconos[tipo]} ${nombres[tipo]}: <em>No disponible</em></div>`;
    }
  }
  
  document.getElementById('distance-stats').innerHTML = html;
  document.getElementById('distance-info').style.display = 'block';
}

function limpiarDistancias() {
  if (clickMarker) {
    map.removeLayer(clickMarker);
    clickMarker = null;
  }
  
  distanceLabels.forEach(label => {
    map.removeLayer(label);
  });
  distanceLabels = [];
  
  marcadoresCercanos.forEach(marker => {
    map.removeLayer(marker);
  });
  marcadoresCercanos = [];
  
  const capasEquipamiento = ['bomberos', 'salud', 'recracion_deporte', 'seguridad', 'educacion'];
  capasEquipamiento.forEach(nombreCapa => {
    const checkbox = document.getElementById(`check_${nombreCapa}`);
    if (checkbox && checkbox.checked && capasOriginales[nombreCapa]) {
      if (layerGroups[nombreCapa]) {
        map.removeLayer(layerGroups[nombreCapa]);
      }
      layerGroups[nombreCapa] = capasOriginales[nombreCapa];
      layerGroups[nombreCapa].addTo(map);
      delete capasOriginales[nombreCapa];
    }
  });
  
  document.getElementById('distance-info').style.display = 'none';
  document.getElementById('distance-stats').innerHTML = '';
  
  setStatus('✅ Consulta de distancias limpiada', '#27ae60');
}

// ============================================================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ============================================================================

crearControles();
cargarBarriosParaBusqueda();
configurarBusqueda();
setStatus('✅ Geoportal listo - Seleccione capas para visualizar', '#27ae60');
