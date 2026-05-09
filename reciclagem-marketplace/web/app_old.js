const API_BASE = 'http://localhost:4000/api';

let currentUser = null;
let currentFilter = null;
let allListings = [];

// Icons for different recycling types
const typeIcons = {
  plastic: '🥤',
  metal: '⚙️',
  paper: '📄',
  glass: '🥃',
  organic: '🌱',
  electronics: '📱',
  textiles: '👕',
  other: '♻️'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showListingsScreen();
    loadListings();
  }
});

async function handleLogin(event) {
  event.preventDefault();
  const phone = document.getElementById('phone').value;
  const errorEl = document.getElementById('loginError');
  
  try {
    errorEl.textContent = '';
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    if (!response.ok) {
      throw new Error('Falha no login');
    }

    const data = await response.json();
    currentUser = data.data;
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    showListingsScreen();
    loadListings();
    document.getElementById('phone').value = '';
  } catch (error) {
    errorEl.textContent = 'Erro ao fazer login. Tente novamente.';
    console.error(error);
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('user');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('listingsScreen').style.display = 'none';
  document.getElementById('userMenu').style.display = 'none';
}

function showListingsScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('listingsScreen').style.display = 'block';
  document.getElementById('userMenu').style.display = 'flex';
  document.getElementById('userPhone').textContent = currentUser.phone;
}

async function loadListings() {
  try {
    const container = document.getElementById('listingsContainer');
    container.innerHTML = '<div class="loading">Carregando anúncios...</div>';

    const response = await fetch(`${API_BASE}/listings`);
    if (!response.ok) {
      throw new Error('Falha ao carregar anúncios');
    }

    const data = await response.json();
    allListings = data.data || [];
    renderListings();
  } catch (error) {
    const container = document.getElementById('listingsContainer');
    container.innerHTML = '<div class="empty-state">Erro ao carregar anúncios</div>';
    console.error(error);
  }
}

function filterListings(type) {
  currentFilter = type;
  
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  renderListings();
}

function renderListings() {
  const container = document.getElementById('listingsContainer');
  
  let filteredListings = allListings;
  if (currentFilter) {
    filteredListings = allListings.filter(item => item.type === currentFilter);
  }

  if (filteredListings.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum anúncio encontrado</div>';
    return;
  }

  container.innerHTML = filteredListings.map(listing => `
    <div class="listing-card">
      <div class="listing-image">
        ${typeIcons[listing.type] || '♻️'}
      </div>
      <div class="listing-content">
        <span class="listing-type">${listing.type.toUpperCase()}</span>
        <h3 class="listing-title">${listing.title}</h3>
        <p class="listing-address">
          📍 ${listing.address}
        </p>
        <div class="listing-footer">
          <div>
            <div class="listing-price">€${listing.price.toFixed(2)}</div>
          </div>
          <div class="listing-weight">${listing.weight} kg</div>
        </div>
      </div>
    </div>
  `).join('');
}
