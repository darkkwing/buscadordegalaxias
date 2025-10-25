let formBuscar, inputBuscar, btnBuscar, estadoCargando, estadoVacio, estadoError, resultGrid, btnCargarMas, msgValidacion;
let nextUrl = null; 

document.addEventListener('DOMContentLoaded', () => {

  formBuscar     = document.getElementById('formBuscar');
  inputBuscar    = document.getElementById('inputBuscar');
  btnBuscar      = document.getElementById('btnBuscar');
  estadoCargando = document.getElementById('estadoCargando');
  estadoVacio    = document.getElementById('estadoVacio');
  estadoError    = document.getElementById('estadoError');
  resultGrid     = document.getElementById('resultGrid');
  btnCargarMas   = document.getElementById('btnCargarMas');
  msgValidacion  = document.getElementById('msgValidacion');


  formBuscar.addEventListener('submit', buscar);    
  btnCargarMas.addEventListener('click', cargarMas);    

  inputBuscar.addEventListener('input', () => {
    if (msgValidacion && !msgValidacion.classList.contains('d-none')) {
      msgValidacion.classList.add('d-none');
    }
  });
});

async function buscar(e) {
  e.preventDefault();

  let query = (inputBuscar.value || '').trim();
  if (query.length < 3) {
    if (msgValidacion) msgValidacion.classList.remove('d-none');
    inputBuscar.focus();
    return;
  }
  if (msgValidacion) msgValidacion.classList.add('d-none');

  mostrarCargando(true);

  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`;
  try {
    let res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let data = await res.json();

    let collection = data && data.collection ? data.collection : null;
    let items = collection && Array.isArray(collection.items) ? collection.items : [];
    let links = collection && Array.isArray(collection.links) ? collection.links : [];
    
    if (items.length === 0) {
      nextUrl = null;
      mostrarVacio();
      return;
    }

    let simples = items.map(aItemSimple);

    pintarResultados(simples, true);

    let nextObj = links.find(l => l && (l.rel || '').toLowerCase() === 'next' && l.href);
    nextUrl = nextObj ? nextObj.href : null;
    if (nextUrl) {
      btnCargarMas.classList.remove('d-none');
    } else {
      btnCargarMas.classList.add('d-none');
    }

    restaurar();
  } catch (err) {
    console.error('Error en búsqueda:', err);
    nextUrl = null;
    mostrarError();
  }
}

async function cargarMas() {
  if (!nextUrl) return;

  mostrarCargando(false);

  try {
    let res = await fetch(nextUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let data = await res.json();

    let collection = data && data.collection ? data.collection : null;
    let items = collection && Array.isArray(collection.items) ? collection.items : [];
    let links = collection && Array.isArray(collection.links) ? collection.links : [];

    if (items.length > 0) {
      let simples = items.map(aItemSimple);
      pintarResultados(simples, false); 
    }

    let nextObj = links.find(l => l && (l.rel || '').toLowerCase() === 'next' && l.href);
    nextUrl = nextObj ? nextObj.href : null;
    if (nextUrl) {
      btnCargarMas.classList.remove('d-none');
    } else {
      btnCargarMas.classList.add('d-none');
    }

    restaurar();
  } catch (err) {
    console.error('Error en paginación:', err);
    mostrarError();
  }
}

function aItemSimple(item) {
  let imgUrl = 'img/placeholder.jpg';
  if (item && item.links && item.links[0] && item.links[0].href) {
    imgUrl = item.links[0].href;
  }

  let d0 = {};
  if (item && Array.isArray(item.data) && item.data[0]) {
    d0 = item.data[0];
  }

  let title = d0 && d0.title ? String(d0.title).trim() : 'Sin título';

  let desc = d0 && d0.description ? String(d0.description).trim() : 'Sin descripción';
  if (desc.length > 280) desc = desc.slice(0, 280) + '…';

  let date = '';
  if (d0 && d0.date_created) {
    let dt = new Date(d0.date_created);
    if (!isNaN(dt.getTime())) {
      date = dt.toLocaleDateString('es-UY');
    }
  }

  return { imgUrl, title, desc, date };
}

function pintarResultados(items, limpiarPrimero) {
  if (limpiarPrimero) {
    resultGrid.innerHTML = '';
  }

  items.forEach(obj => {
    let t = miniEscape(obj.title);
    let d = miniEscape(obj.desc);
    let f = miniEscape(obj.date || '');

    resultGrid.innerHTML += `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <img src="${obj.imgUrl}" alt="${t}" class="card-img-top card-img-fixed" loading="lazy" />
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-2">${t}</h5>
            <p class="card-text text-body-secondary flex-grow-1">${d}</p>
            <small class="text-muted mt-2">${f}</small>
            <div class="mt-3">
              <a href="${obj.imgUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">
                Abrir imagen
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  });
};

function mostrarCargando(limpiarGrid) {
  if (estadoVacio)  estadoVacio.classList.add('d-none');
  if (estadoError)  estadoError.classList.add('d-none');

  if (estadoCargando) estadoCargando.classList.remove('d-none');

  if (btnBuscar) {
    btnBuscar.disabled = true;
    btnBuscar.setAttribute('aria-busy', 'true');
    btnBuscar.textContent = 'Buscando…';
  }

  if (limpiarGrid && resultGrid) {
    resultGrid.innerHTML = '';
  }
  if (btnCargarMas) btnCargarMas.classList.add('d-none');
}

function mostrarVacio() {
  if (estadoCargando) estadoCargando.classList.add('d-none');
  if (estadoError)    estadoError.classList.add('d-none');
  if (estadoVacio)    estadoVacio.classList.remove('d-none');

  if (btnBuscar) {
    btnBuscar.disabled = false;
    btnBuscar.setAttribute('aria-busy', 'false');
    btnBuscar.textContent = 'Buscar imágenes';
  }
}

function mostrarError() {
  if (estadoCargando) estadoCargando.classList.add('d-none');
  if (estadoVacio)    estadoVacio.classList.add('d-none');
  if (estadoError)    estadoError.classList.remove('d-none');

  if (btnBuscar) {
    btnBuscar.disabled = false;
    btnBuscar.setAttribute('aria-busy', 'false');
    btnBuscar.textContent = 'Buscar imágenes';
  }
}

function restaurar() {
  if (estadoCargando) estadoCargando.classList.add('d-none');
  if (estadoVacio)    estadoVacio.classList.add('d-none');
  if (estadoError)    estadoError.classList.add('d-none');

  if (btnBuscar) {
    btnBuscar.disabled = false;
    btnBuscar.setAttribute('aria-busy', 'false');
    btnBuscar.textContent = 'Buscar imágenes';
  }
};

function miniEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};