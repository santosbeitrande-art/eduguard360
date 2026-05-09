const API_BASE = 'http://localhost:4000/api';

let currentUser = null;
let currentProfile = null;
let guestMode = false;
let currentFilter = null;
let currentSearch = '';
let allListings = [];
let selectedListing = null;
let uploadedPhotos = [];
let selectedLocation = null;

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

const typeNames = {
  plastic: 'Plástico',
  metal: 'Metal',
  paper: 'Papel',
  glass: 'Vidro',
  organic: 'Orgânico',
  electronics: 'Eletrônicos',
  textiles: 'Têxteis',
  other: 'Outro'
};

const userRoleNames = {
  seller: 'Vendedor',
  buyer: 'Comprador'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('user');
  const savedProfile = localStorage.getItem('profile');

  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    currentProfile = savedProfile ? JSON.parse(savedProfile) : null;

    showListingsScreen();
    loadListings();

    if (!currentProfile) {
      document.getElementById('registerActionBtn').style.display = 'inline-flex';
    }
  } else {
    showLoginScreen();
  }
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

async function handleLogin(event) {
  event.preventDefault();
  const phone = document.getElementById('phone').value.trim();
  const errorEl = document.getElementById('loginError');
  const btn = event.target.querySelector('button');
  
  try {
    if (!phone) {
      throw new Error('Insira um número de telefone válido.');
    }

    // Validar formato moçambicano
    const phoneRegex = /^(\+258|258)?[8-9][0-9]\s?[0-9]{3}\s?[0-9]{3,4}$/;
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error('Formato inválido. Use: +258 82 123 4567 ou 821234567');
    }

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'A carregar...';

    // Tentar login primeiro (para usuários existentes)
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });

      if (response.ok) {
        const data = await response.json();
        currentUser = data.data;
      } else {
        // Se não existir, criar usuário automaticamente
        currentUser = {
          phone: cleanPhone,
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString()
        };
      }
    } catch (apiError) {
      // Se API falhar, criar usuário localmente
      console.warn('API indisponível, criando usuário localmente:', apiError);
      currentUser = {
        phone: cleanPhone,
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString()
      };
    }

    localStorage.setItem('user', JSON.stringify(currentUser));
    guestMode = false;
    
    currentProfile = localStorage.getItem('profile') ? JSON.parse(localStorage.getItem('profile')) : null;
    showListingsScreen();
    loadListings();

    if (!currentProfile) {
      document.getElementById('registerActionBtn').style.display = 'inline-flex';
    }

    document.getElementById('phone').value = '';
  } catch (error) {
    errorEl.textContent = error.message || 'Erro ao fazer login. Tente novamente.';
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

function showLoginScreen(message = '') {
  guestMode = false;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('listingsScreen').style.display = 'none';
  document.getElementById('userMenu').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('profileForm').style.display = 'none';
  document.getElementById('loginError').textContent = message;
}

function continueAsGuest() {
  guestMode = true;
  currentUser = null;
  currentProfile = null;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('listingsScreen').style.display = 'block';
  showListingsScreen();
  loadListings();
}

function promptRegistration() {
  if (currentUser) {
    showProfileStep();
  } else {
    showLoginScreen('Para comprar ou vender, registe o seu número de telefone e nome.');
  }
}

function showProfileStep() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('profileForm').style.display = 'block';
  document.getElementById('loginError').textContent = '';
  document.getElementById('profileTitle').textContent = 'Completar registo';
  document.getElementById('profileDescription').textContent = 'Escolha o seu papel e registe o seu nome ou o nome da empresa.';
}

function submitProfile(event) {
  event.preventDefault();
  const fullName = document.getElementById('fullName').value.trim();
  const role = document.querySelector('input[name="role"]:checked')?.value;
  const company = document.getElementById('company').value.trim();
  const collector = document.getElementById('collector').value.trim();
  const errorEl = document.getElementById('loginError');

  if (!fullName) {
    errorEl.textContent = 'Indique o seu nome ou nome da empresa.';
    return;
  }

  if (!role) {
    errorEl.textContent = 'Selecione o seu papel no sistema.';
    return;
  }

  if (role === 'seller' && !collector) {
    errorEl.textContent = 'Indique o ponto de recolha ou descrição do local.';
    return;
  }

  if (role === 'buyer' && !company) {
    errorEl.textContent = 'Indique a empresa para a qual trabalha.';
    return;
  }

  currentProfile = {
    fullName,
    role,
    company: company || null,
    collector: collector || null,
    context: 'Moçambique',
    createdAt: new Date().toISOString()
  };

  localStorage.setItem('profile', JSON.stringify(currentProfile));

  const savedRecords = JSON.parse(localStorage.getItem('registrationRecords') || '[]');
  const registration = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    phone: currentUser?.phone || null,
    name: fullName,
    role,
    company: company || null,
    collector: collector || null,
    context: 'Moçambique',
    createdAt: currentProfile.createdAt
  };
  savedRecords.push(registration);
  localStorage.setItem('registrationRecords', JSON.stringify(savedRecords));

  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('profileForm').style.display = 'none';
  document.getElementById('loginError').textContent = '';

  showListingsScreen();
  loadListings();
}

function logout() {
  currentUser = null;
  currentProfile = null;
  guestMode = false;
  currentFilter = null;
  currentSearch = '';
  localStorage.removeItem('user');
  localStorage.removeItem('profile');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('listingsScreen').style.display = 'none';
  document.getElementById('userMenu').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('profileForm').style.display = 'none';
}

function showListingsScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('listingsScreen').style.display = 'block';
  document.getElementById('userMenu').style.display = 'flex';
  document.getElementById('userPhone').textContent = currentUser?.phone || (guestMode ? 'Visitante' : '');

  if (currentProfile) {
    document.getElementById('userRole').textContent = `• ${userRoleNames[currentProfile.role]}`;
    document.getElementById('userContext').textContent = `• ${currentProfile.context}`;
    
    // Mostrar botão de criar anúncio apenas para vendedores
    const createBtn = document.getElementById('createListingBtn');
    createBtn.style.display = currentProfile.role === 'seller' ? 'inline-flex' : 'none';
  } else if (guestMode) {
    document.getElementById('userRole').textContent = '• Visitante';
    document.getElementById('userContext').textContent = '• Acesso público';
  } else if (currentUser) {
    document.getElementById('userRole').textContent = '• Visitante';
    document.getElementById('userContext').textContent = '• Acesso público';
  } else {
    document.getElementById('userRole').textContent = '';
    document.getElementById('userContext').textContent = '';
  }

  const registerBtn = document.getElementById('registerActionBtn');
  registerBtn.style.display = currentProfile ? 'none' : 'inline-flex';
}

async function loadListings() {
  try {
    const container = document.getElementById('listingsContainer');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div><p style="color: #6b7280;">Carregando anúncios...</p></div>';

    // Carregar anúncios da API
    let apiListings = [];
    try {
      const response = await fetch(`${API_BASE}/listings`);
      if (response.ok) {
        const data = await response.json();
        apiListings = data.data || [];
      }
    } catch (apiError) {
      console.warn('API indisponível, usando apenas anúncios locais:', apiError);
    }

    // Carregar anúncios criados pelos usuários
    loadUserListings();

    // Combinar anúncios da API com anúncios criados pelos usuários
    const userListings = JSON.parse(localStorage.getItem('userListings') || '[]');
    const allListingsCombined = [
      ...userListings,
      ...apiListings.filter(apiListing => !userListings.some(userListing => userListing.id === apiListing.id))
    ];

    allListings = allListingsCombined;
    renderListings();
    updateStats();
  } catch (error) {
    const container = document.getElementById('listingsContainer');
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">❌</span><h3>Erro ao carregar anúncios</h3><p>Tente recarregar a página</p></div>';
    console.error(error);
  }
}

function handleSearch() {
  currentSearch = document.getElementById('searchInput').value.toLowerCase();
  renderListings();
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

function updateStats() {
  const filtered = getFilteredListings();
  const totalItems = filtered.length;
  const totalValue = filtered.reduce((sum, item) => sum + item.price, 0);
  const totalWeight = filtered.reduce((sum, item) => sum + item.weight, 0);
  const registrationCount = JSON.parse(localStorage.getItem('registrationRecords') || '[]').length;

  document.getElementById('totalItems').textContent = totalItems;
  document.getElementById('totalValue').textContent = `MT${totalValue.toFixed(2)}`;
  document.getElementById('totalWeight').textContent = `${totalWeight.toFixed(1)} kg`;
  document.getElementById('registrationCount').textContent = registrationCount;
  document.getElementById('listingsCount').textContent = `${totalItems} anúncio${totalItems !== 1 ? 's' : ''} encontrado${totalItems !== 1 ? 's' : ''}`;
}

function getMarketplaceFeeRate(price) {
  if (price >= 5000) return 0.03;
  if (price >= 1000) return 0.025;
  return 0.02;
}

function formatMt(value) {
  return `MT${value.toFixed(2)}`;
}

function getFilteredListings() {
  let filtered = allListings;

  if (currentFilter) {
    filtered = filtered.filter(item => item.type === currentFilter);
  }

  if (currentSearch) {
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(currentSearch) ||
      item.address.toLowerCase().includes(currentSearch) ||
      item.type.toLowerCase().includes(currentSearch)
    );
  }

  return filtered;
}

function renderListings() {
  const container = document.getElementById('listingsContainer');
  const emptyState = document.getElementById('emptyState');
  const filteredListings = getFilteredListings();

  if (filteredListings.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  emptyState.style.display = 'none';

  container.innerHTML = filteredListings.map(listing => {
    const isOwner = currentUser && listing.sellerId === currentUser.id;
    const isReserved = listing.status === 'reserved';
    const isSold = listing.status === 'sold';
    const isCurrentUserReserved = isReserved && listing.reservation?.buyerId === currentUser?.id;
    const queuePosition = isReserved && listing.reservation?.queue ? 
      listing.reservation.queue.findIndex(buyer => buyer.id === currentUser?.id) + 1 : 0;

    let statusClass = 'status-available';
    let statusText = 'Disponível';
    
    if (isSold) {
      statusClass = 'status-sold';
      statusText = 'Vendido';
    } else if (isReserved) {
      statusClass = 'status-reserved';
      statusText = isCurrentUserReserved ? 'Reservado por você' : 'Reservado';
    }

    const mainImage = listing.photos && listing.photos.length > 0 ? listing.photos[0] : typeIcons[listing.type] || '♻️';
    const isEmoji = typeof mainImage === 'string' && mainImage.length <= 2;

    return `
    <div class="listing-card ${isSold ? 'sold' : ''}" onclick="openModal(${listing.id})">
      <div class="listing-status ${statusClass}">${statusText}</div>
      <div class="listing-image">
        ${isEmoji ? mainImage : `<img src="${mainImage}" alt="${listing.title}" style="width: 100%; height: 100%; object-fit: cover;">`}
      </div>
      <div class="listing-content">
        <span class="listing-type">${listing.type.toUpperCase()}</span>
        <h3 class="listing-title">${listing.title}</h3>
        <p class="listing-address">
          📍 ${listing.address}
        </p>
        <div class="listing-footer">
          <div>
            <div class="listing-price">${formatMt(listing.price)}</div>
            ${isSold && listing.platformFee ? `
              <div class="listing-fee-details">
                <small>Retenção: ${(listing.platformFeeRate * 100).toFixed(1)}%</small>
                <small>Recebe: ${formatMt(listing.sellerNetAmount)}</small>
              </div>
            ` : ''}
          </div>
          <div class="listing-weight">⚖️ ${listing.weight} kg</div>
        </div>
        ${isReserved && listing.reservation ? `
          <div class="reservation-info">
            <small>Reservado por: ${listing.reservation.buyerName}</small>
            ${queuePosition > 0 ? `<div class="queue-position">Fila: ${queuePosition}º</div>` : ''}
          </div>
        ` : ''}
        <div class="reservation-actions">
          ${!isOwner && !isSold ? `
            ${!isReserved ? 
              `<button class="btn-reserve" onclick="reserveListing(event, ${listing.id})">Reservar</button>` :
              isCurrentUserReserved ?
                `<button class="btn-unreserve" onclick="unreserveListing(event, ${listing.id})">Cancelar Reserva</button>` :
                queuePosition > 0 ?
                  `<button class="btn-unreserve" onclick="unreserveListing(event, ${listing.id})">Sair da Fila</button>` :
                  `<button class="btn-reserve" onclick="reserveListing(event, ${listing.id})">Entrar na Fila</button>`
            }
          ` : ''}
          ${isOwner && isReserved ? `
            <button class="btn-unreserve" onclick="unreserveListing(event, ${listing.id})">Liberar Reserva</button>
            <button class="btn-primary" onclick="markAsSold(event, ${listing.id})" style="background: var(--success);">Marcar Vendido</button>
          ` : ''}
        </div>
      </div>
    </div>
  `}).join('');

  updateStats();
}

function openModal(listingId) {
  selectedListing = allListings.find(l => l.id === listingId);
  if (!selectedListing) return;

  const isOwner = currentUser && selectedListing.sellerId === currentUser.id;
  const isReserved = selectedListing.status === 'reserved';
  const isSold = selectedListing.status === 'sold';
  const isCurrentUserReserved = isReserved && selectedListing.reservation?.buyerId === currentUser?.id;

  // Mostrar primeira foto ou ícone
  const mainImage = selectedListing.photos && selectedListing.photos.length > 0 ? 
    selectedListing.photos[0] : typeIcons[selectedListing.type] || '♻️';
  const isEmoji = typeof mainImage === 'string' && mainImage.length <= 2;
  
  document.getElementById('modalImage').innerHTML = isEmoji ? 
    `<div style="font-size: 5rem; text-align: center;">${mainImage}</div>` : 
    `<img src="${mainImage}" alt="${selectedListing.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">`;

  document.getElementById('modalTitle').textContent = selectedListing.title;
  document.getElementById('modalType').textContent = `${selectedListing.type.toUpperCase()}`;
  document.getElementById('modalAddress').textContent = selectedListing.address;
  document.getElementById('modalWeight').textContent = `${selectedListing.weight} kg`;
  document.getElementById('modalPrice').textContent = formatMt(selectedListing.price);

  const marketplaceFeeRate = getMarketplaceFeeRate(selectedListing.price);
  let saleInfo = `<div class="reservation-info" style="margin-top: 1rem;"><strong>Taxa de retenção estimada:</strong> ${(marketplaceFeeRate * 100).toFixed(1)}% do total da venda.</div>`;
  
  if (isSold) {
    const platformFee = selectedListing.platformFee ?? parseFloat((selectedListing.price * marketplaceFeeRate).toFixed(2));
    const sellerNet = selectedListing.sellerNetAmount ?? parseFloat((selectedListing.price - platformFee).toFixed(2));
    saleInfo = `
      <div class="reservation-info" style="margin-top: 1rem;">
        <h4>📋 Detalhes de Venda</h4>
        <p><strong>Taxa de retenção aplicada:</strong> ${(selectedListing.platformFeeRate * 100).toFixed(1)}%</p>
        <p><strong>Valor retido:</strong> ${formatMt(platformFee)}</p>
        <p><strong>Recebimento do vendedor:</strong> ${formatMt(sellerNet)}</p>
      </div>
    `;
  }

  // Adicionar informações de reserva e ações
  let modalActions = '';
  if (!isOwner && !isSold) {
    if (!isReserved) {
      modalActions = `<button class="btn-primary" onclick="reserveListing(event, ${selectedListing.id}); closeModal();">Reservar Anúncio</button>`;
    } else if (isCurrentUserReserved) {
      modalActions = `<button class="btn-unreserve" onclick="unreserveListing(event, ${selectedListing.id}); closeModal();">Cancelar Minha Reserva</button>`;
    } else {
      const queuePosition = selectedListing.reservation?.queue?.findIndex(buyer => buyer.id === currentUser?.id) + 1 || 0;
      if (queuePosition > 0) {
        modalActions = `<div class="queue-position" style="margin-bottom: 1rem;">Você está na posição ${queuePosition} da fila</div><button class="btn-unreserve" onclick="unreserveListing(event, ${selectedListing.id}); closeModal();">Sair da Fila</button>`;
      } else {
        modalActions = `<button class="btn-reserve" onclick="reserveListing(event, ${selectedListing.id}); closeModal();">Entrar na Fila de Espera</button>`;
      }
    }
  } else if (isOwner && isReserved) {
    modalActions = `
      <button class="btn-unreserve" onclick="unreserveListing(event, ${selectedListing.id}); closeModal();">Liberar Reserva</button>
      <button class="btn-primary" onclick="markAsSold(event, ${selectedListing.id}); closeModal();" style="background: var(--success);">Marcar como Vendido</button>
    `;
  }

  // Adicionar informações de reserva ao modal
  let reservationInfo = '';
  if (isReserved && selectedListing.reservation) {
    reservationInfo = `
      <div class="reservation-info" style="margin-top: 1rem;">
        <h4>📋 Status da Reserva</h4>
        <p><strong>Reservado por:</strong> ${selectedListing.reservation.buyerName}</p>
        <p><strong>Data:</strong> ${new Date(selectedListing.reservation.timestamp).toLocaleDateString('pt-PT')}</p>
        ${selectedListing.reservation.queue && selectedListing.reservation.queue.length > 0 ? 
          `<p><strong>Fila de espera:</strong> ${selectedListing.reservation.queue.length} pessoa(s)</p>` : ''}
      </div>
    `;
  }

  // Inserir ações e informações no modal
  const modalDetails = document.querySelector('.modal-details');
  const existingActions = modalDetails.querySelector('.modal-actions');
  if (existingActions) existingActions.remove();
  
  const existingReservation = modalDetails.querySelector('.reservation-info');
  if (existingReservation) existingReservation.remove();

  if (modalActions) {
    modalDetails.insertAdjacentHTML('beforeend', `<div class="modal-actions" style="margin-top: 1rem;">${modalActions}</div>`);
  }
  
  if (reservationInfo) {
    modalDetails.insertAdjacentHTML('beforeend', reservationInfo);
  }
  
  if (saleInfo) {
    modalDetails.insertAdjacentHTML('beforeend', saleInfo);
  }

  document.getElementById('detailModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('detailModal').style.display = 'none';
  selectedListing = null;
}

function showCreateListingForm() {
  if (!currentProfile || currentProfile.role !== 'seller') {
    alert('Apenas vendedores registrados podem criar anúncios.');
    return;
  }
  document.getElementById('createListingModal').style.display = 'flex';
  // Inicializar mapa após um pequeno delay para garantir que o modal está visível
  setTimeout(initMap, 100);
}

function closeCreateListingModal() {
  document.getElementById('createListingModal').style.display = 'none';
  document.getElementById('createListingForm').reset();
  uploadedPhotos = [];
  selectedLocation = null;
  document.getElementById('photoPreview').innerHTML = '';
  document.getElementById('coordinates').textContent = 'Coordenadas: Não definidas';
}

function handlePhotoUpload(event) {
  const files = Array.from(event.target.files);
  const maxFiles = 5;
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (uploadedPhotos.length + files.length > maxFiles) {
    alert(`Máximo de ${maxFiles} fotos permitidas.`);
    return;
  }

  files.forEach(file => {
    if (file.size > maxSize) {
      alert(`Arquivo ${file.name} é muito grande. Máximo 5MB.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert(`Arquivo ${file.name} não é uma imagem válida.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedPhotos.push({
        file: file,
        dataUrl: e.target.result,
        id: Date.now() + Math.random()
      });
      updatePhotoPreview();
    };
    reader.readAsDataURL(file);
  });
}

function updatePhotoPreview() {
  const container = document.getElementById('photoPreview');
  container.innerHTML = uploadedPhotos.map(photo => `
    <div class="photo-item">
      <img src="${photo.dataUrl}" alt="Foto do anúncio">
      <button type="button" class="photo-remove" onclick="removePhoto('${photo.id}')">×</button>
    </div>
  `).join('');
}

function removePhoto(photoId) {
  uploadedPhotos = uploadedPhotos.filter(photo => photo.id !== photoId);
  updatePhotoPreview();
}

function initMap() {
  const mapPlaceholder = document.getElementById('map');
  mapPlaceholder.addEventListener('click', () => {
    // Simulação de seleção de localização
    // Em produção, isso seria integrado com Google Maps ou OpenStreetMap
    const lat = -25.9692 + (Math.random() - 0.5) * 0.01; // Maputo area
    const lng = 32.5732 + (Math.random() - 0.5) * 0.01;
    
    selectedLocation = { lat, lng };
    document.getElementById('coordinates').textContent = `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Visual feedback
    mapPlaceholder.innerHTML = `
      <div class="map-placeholder-content">
        <span>📍</span>
        <p>Localização selecionada!</p>
        <small>${lat.toFixed(4)}, ${lng.toFixed(4)}</small>
      </div>
    `;
    mapPlaceholder.style.background = 'rgba(16, 185, 129, 0.1)';
  });
}

async function submitCreateListing(event) {
  event.preventDefault();
  
  if (!currentProfile || currentProfile.role !== 'seller') {
    alert('Apenas vendedores podem criar anúncios.');
    return;
  }

  const title = document.getElementById('listingTitle').value.trim();
  const type = document.getElementById('listingType').value;
  const weight = parseFloat(document.getElementById('listingWeight').value);
  const price = parseFloat(document.getElementById('listingPrice').value);
  const description = document.getElementById('listingDescription').value.trim();
  const address = document.getElementById('listingAddress').value.trim();

  if (!title || !type || !weight || !price || !address) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  if (uploadedPhotos.length === 0) {
    alert('Adicione pelo menos uma foto do material.');
    return;
  }

  if (!selectedLocation) {
    alert('Selecione a localização no mapa.');
    return;
  }

  const btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Publicando...';

  try {
    // Criar novo anúncio
    const newListing = {
      id: Date.now(),
      title,
      type,
      weight,
      price,
      description,
      address,
      location: selectedLocation,
      photos: uploadedPhotos.map(photo => photo.dataUrl), // Em produção, upload para servidor
      sellerId: currentUser.id,
      sellerName: currentProfile.fullName,
      sellerPhone: currentUser.phone,
      status: 'available', // available, reserved, sold
      reservation: null, // { buyerId, buyerName, buyerPhone, timestamp, queue: [] }
      createdAt: new Date().toISOString()
    };

    // Salvar localmente (em produção, enviar para API)
    const savedListings = JSON.parse(localStorage.getItem('userListings') || '[]');
    savedListings.push(newListing);
    localStorage.setItem('userListings', JSON.stringify(savedListings));

    // Adicionar aos anúncios globais
    allListings.unshift(newListing);
    renderListings();
    updateStats();

    closeCreateListingModal();
    alert('Anúncio criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    alert('Erro ao criar anúncio. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar Anúncio';
  }
}

function reserveListing(eventOrId, listingId) {
  const event = typeof listingId !== 'undefined' ? eventOrId : null;
  const id = typeof listingId !== 'undefined' ? listingId : eventOrId;
  if (event && event.stopPropagation) event.stopPropagation();

  if (!currentProfile) {
    promptRegistration();
    return;
  }

  const listing = allListings.find(l => l.id === id);
  if (!listing) return;

  if (listing.status === 'sold') {
    alert('Este anúncio já foi vendido.');
    return;
  }

  if (listing.status === 'reserved' && listing.reservation.buyerId !== currentUser.id) {
    // Adicionar à fila de espera
    if (!listing.reservation.queue) listing.reservation.queue = [];
    
    const alreadyInQueue = listing.reservation.queue.some(buyer => buyer.id === currentUser.id);
    if (alreadyInQueue) {
      alert('Você já está na fila de espera para este anúncio.');
      return;
    }

    listing.reservation.queue.push({
      id: currentUser.id,
      name: currentProfile.fullName,
      phone: currentUser.phone,
      timestamp: new Date().toISOString()
    });

    alert(`Adicionado à fila de espera. Posição: ${listing.reservation.queue.length}`);
  } else if (listing.status === 'available' || (listing.status === 'reserved' && listing.reservation.buyerId === currentUser.id)) {
    // Reservar ou confirmar reserva
    listing.status = 'reserved';
    listing.reservation = {
      buyerId: currentUser.id,
      buyerName: currentProfile.fullName,
      buyerPhone: currentUser.phone,
      timestamp: new Date().toISOString(),
      queue: listing.reservation?.queue || []
    };
    
    alert('Anúncio reservado com sucesso! Entre em contacto com o vendedor.');
  }

  // Salvar mudanças
  saveListingsToStorage();
  renderListings();
  updateStats();
}

function unreserveListing(eventOrId, listingId) {
  const event = typeof listingId !== 'undefined' ? eventOrId : null;
  const id = typeof listingId !== 'undefined' ? listingId : eventOrId;
  if (event && event.stopPropagation) event.stopPropagation();

  const listing = allListings.find(l => l.id === id);
  if (!listing || listing.status !== 'reserved') return;

  if (listing.reservation.buyerId === currentUser.id) {
    // Vendedor ou comprador cancelando reserva
    if (listing.sellerId === currentUser.id) {
      // Vendedor cancelando - liberar para próximo na fila
      if (listing.reservation.queue && listing.reservation.queue.length > 0) {
        const nextBuyer = listing.reservation.queue.shift();
        listing.reservation = {
          buyerId: nextBuyer.id,
          buyerName: nextBuyer.name,
          buyerPhone: nextBuyer.phone,
          timestamp: new Date().toISOString(),
          queue: listing.reservation.queue
        };
        alert(`Reserva cancelada. Anúncio agora reservado para ${nextBuyer.name}.`);
      } else {
        listing.status = 'available';
        listing.reservation = null;
        alert('Reserva cancelada. Anúncio disponível novamente.');
      }
    } else {
      // Comprador cancelando
      if (listing.reservation.queue && listing.reservation.queue.length > 0) {
        const nextBuyer = listing.reservation.queue.shift();
        listing.reservation = {
          buyerId: nextBuyer.id,
          buyerName: nextBuyer.name,
          buyerPhone: nextBuyer.phone,
          timestamp: new Date().toISOString(),
          queue: listing.reservation.queue
        };
        alert('Reserva cancelada. Anúncio passado para próximo na fila.');
      } else {
        listing.status = 'available';
        listing.reservation = null;
        alert('Reserva cancelada. Anúncio disponível novamente.');
      }
    }
  } else {
    // Remover da fila de espera
    if (listing.reservation.queue) {
      listing.reservation.queue = listing.reservation.queue.filter(buyer => buyer.id !== currentUser.id);
      alert('Removido da fila de espera.');
    }
  }

  saveListingsToStorage();
  renderListings();
  updateStats();
}

function markAsSold(eventOrId, listingId) {
  const event = typeof listingId !== 'undefined' ? eventOrId : null;
  const id = typeof listingId !== 'undefined' ? listingId : eventOrId;
  if (event && event.stopPropagation) event.stopPropagation();

  const listing = allListings.find(l => l.id === id);
  if (!listing || listing.sellerId !== currentUser.id) return;

  const feeRate = getMarketplaceFeeRate(listing.price);
  const platformFee = parseFloat((listing.price * feeRate).toFixed(2));
  const sellerNet = parseFloat((listing.price - platformFee).toFixed(2));

  listing.status = 'sold';
  listing.soldAt = new Date().toISOString();
  listing.platformFeeRate = feeRate;
  listing.platformFee = platformFee;
  listing.sellerNetAmount = sellerNet;

  saveListingsToStorage();
  renderListings();
  updateStats();
  alert(`Anúncio marcado como vendido!\nTaxa de retenção aplicada: ${(feeRate * 100).toFixed(1)}%\nRetido pelo marketplace: ${formatMt(platformFee)}\nRecebimento do vendedor: ${formatMt(sellerNet)}`);
}

function saveListingsToStorage() {
  const userListings = allListings.filter(l => l.sellerId === currentUser?.id);
  localStorage.setItem('userListings', JSON.stringify(userListings));
}

function loadUserListings() {
  const savedListings = JSON.parse(localStorage.getItem('userListings') || '[]');
  // Mesclar com anúncios existentes, dando prioridade aos salvos
  const existingIds = new Set(savedListings.map(l => l.id));
  allListings = [
    ...savedListings,
    ...allListings.filter(l => !existingIds.has(l.id))
  ];
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('detailModal');
  if (e.target === modal) closeModal();
});
