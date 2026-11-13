// Firebase конфигурация - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ!
const firebaseConfig = {
  apiKey: "AIzaSyCtAzc2hrno9X3m4Ew6SMSJt6EsnRR0UVs",
  authDomain: "announcement-board-c7cba.firebaseapp.com",
  databaseURL: "https://announcement-board-c7cba-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "announcement-board-c7cba",
  storageBucket: "announcement-board-c7cba.firebasestorage.app",
  messagingSenderId: "974432777593",
  appId: "1:974432777593:web:6d48fb6367b050dbeeeba8"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Глобальные переменные
let currentUser = null;
let events = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadUserFromStorage();
    setupEventListeners();
    loadEventsFromFirebase();
});

// Загрузка пользователя из localStorage
function loadUserFromStorage() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
    }
}

// Сохранение пользователя в localStorage
function saveUserToStorage() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('currentUser');
    }
}

// Загрузка событий из Firebase в реальном времени
function loadEventsFromFirebase() {
    database.ref('events').on('value', (snapshot) => {
        const data = snapshot.val();
        events = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                events.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        
        // Сортируем по дате создания (новые сначала)
        events.sort((a, b) => b.createdAt - a.createdAt);
        
        renderEvents();
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Открытие модального окна входа
    document.getElementById('loginBtn').addEventListener('click', () => {
        document.getElementById('loginModal').classList.remove('hidden');
    });
    
    // Закрытие модального окна входа
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('loginModal').classList.add('hidden');
    });
    
    // Закрытие модального окна редактирования
    document.querySelector('.close-edit').addEventListener('click', () => {
        document.getElementById('editModal').classList.add('hidden');
    });
    
    // Выбор роли - Ученик
    document.getElementById('studentBtn').addEventListener('click', () => {
        loginAs('student');
    });
    
    // Выбор роли - Преподаватель
    document.getElementById('teacherBtn').addEventListener('click', () => {
        loginAs('teacher');
    });
    
    // Выход
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Создание объявления
    document.getElementById('eventForm').addEventListener('submit', createEvent);
    
    // Редактирование объявления
    document.getElementById('editForm').addEventListener('submit', updateEvent);
    
    // Закрытие модалок по клику вне их
    window.addEventListener('click', (e) => {
        const loginModal = document.getElementById('loginModal');
        const editModal = document.getElementById('editModal');
        
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        }
        if (e.target === editModal) {
            editModal.classList.add('hidden');
        }
    });
}

// Вход в систему
function loginAs(role) {
    const roleName = role === 'student' ? 'Ученик' : 'Преподаватель';
    const userName = prompt(`Введите ваше имя (${roleName}):`);
    
    if (!userName || userName.trim() === '') {
        showNotification('Пожалуйста, введите имя', 'error');
        return;
    }
    
    currentUser = {
        role: role,
        name: userName.trim()
    };
    
    saveUserToStorage();
    updateUI();
    document.getElementById('loginModal').classList.add('hidden');
    renderEvents();
    showNotification(`Добро пожаловать, ${userName}!`, 'success');
}

// Обновление интерфейса
function updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatarIcon = document.getElementById('userAvatarIcon');
    const teacherPanel = document.getElementById('teacherPanel');
    
    if (currentUser) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userName.textContent = currentUser.name;
        
        if (currentUser.role === 'student') {
            userRole.textContent = 'Ученик';
            userAvatarIcon.textContent = '🎓';
            teacherPanel.classList.add('hidden');
        } else {
            userRole.textContent = 'Преподаватель';
            userAvatarIcon.textContent = '👨‍🏫';
            teacherPanel.classList.remove('hidden');
        }
    } else {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        teacherPanel.classList.add('hidden');
    }
}

// Выход из системы
function logout() {
    currentUser = null;
    saveUserToStorage();
    updateUI();
    renderEvents();
    showNotification('Вы вышли из системы', 'info');
}

// Создание объявления
function createEvent(e) {
    e.preventDefault();
    
    const title = document.getElementById('eventTitle').value.trim();
    const people = parseInt(document.getElementById('eventPeople').value);
    const date = document.getElementById('eventDate').value;
    const location = document.getElementById('eventLocation').value.trim();
    const comment = document.getElementById('eventComment').value.trim();
    
    if (!title || !people || !date || !location) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }
    
    const newEventRef = database.ref('events').push();
    const event = {
        title: title,
        people: people,
        date: date,
        location: location,
        comment: comment,
        teacherName: currentUser.name,
        registeredStudents: [],
        createdAt: Date.now()
    };
    
    newEventRef.set(event)
        .then(() => {
            document.getElementById('eventForm').reset();
            showNotification('Объявление успешно создано!', 'success');
        })
        .catch((error) => {
            showNotification('Ошибка при создании: ' + error.message, 'error');
        });
}

// Открытие модального окна редактирования
function openEditModal(eventId) {
    const event = events.find(ev => ev.id === eventId);
    if (!event) return;
    
    document.getElementById('editEventId').value = eventId;
    document.getElementById('editTitle').value = event.title;
    document.getElementById('editPeople').value = event.people;
    document.getElementById('editDate').value = event.date;
    document.getElementById('editLocation').value = event.location;
    document.getElementById('editComment').value = event.comment || '';
    
    document.getElementById('editModal').classList.remove('hidden');
}

// Обновление объявления
function updateEvent(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('editEventId').value;
    const title = document.getElementById('editTitle').value.trim();
    const people = parseInt(document.getElementById('editPeople').value);
    const date = document.getElementById('editDate').value;
    const location = document.getElementById('editLocation').value.trim();
    const comment = document.getElementById('editComment').value.trim();
    
    if (!title || !people || !date || !location) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }
    
    const updates = {
        title: title,
        people: people,
        date: date,
        location: location,
        comment: comment
    };
    
    database.ref('events/' + eventId).update(updates)
        .then(() => {
            document.getElementById('editModal').classList.add('hidden');
            showNotification('Объявление обновлено!', 'success');
        })
        .catch((error) => {
            showNotification('Ошибка при обновлении: ' + error.message, 'error');
        });
}

// Удаление объявления
function deleteEvent(eventId) {
    if (!confirm('Вы уверены, что хотите удалить это объявление?')) {
        return;
    }
    
    database.ref('events/' + eventId).remove()
        .then(() => {
            showNotification('Объявление удалено!', 'success');
        })
        .catch((error) => {
            showNotification('Ошибка при удалении: ' + error.message, 'error');
        });
}

// Отображение объявлений
function renderEvents() {
    const eventsList = document.getElementById('eventsList');
    const noEvents = document.getElementById('noEvents');
    
    if (events.length === 0) {
        eventsList.innerHTML = '';
        noEvents.classList.remove('hidden');
        return;
    }
    
    noEvents.classList.add('hidden');

  // Обновляем счётчик
document.getElementById('totalEvents').textContent = events.length;
    let html = '';
    for (let i = 0; i < events.length; i++) {
        html += createEventCard(events[i]);
    }
    
    eventsList.innerHTML = html;
    
    // Добавляем обработчики для кнопок
    document.querySelectorAll('.register-btn').forEach(btn => {
        btn.addEventListener('click', handleRegistration);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const eventId = e.target.dataset.eventId;
            openEditModal(eventId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const eventId = e.target.dataset.eventId;
            deleteEvent(eventId);
        });
    });
}

// Создание карточки события
function createEventCard(event) {
    const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let buttonHtml = '';
    let actionsHtml = '';
    
    // Кнопки действий для преподавателя
    if (currentUser && currentUser.role === 'teacher') {
        actionsHtml = `
            <div class="event-actions">
                <button class="btn btn-edit edit-btn" data-event-id="${event.id}">✏️ Редактировать</button>
                <button class="btn btn-delete delete-btn" data-event-id="${event.id}">🗑️ Удалить</button>
            </div>
        `;
    }
    
    // Кнопка регистрации для ученика
    if (currentUser && currentUser.role === 'student') {
        const isRegistered = event.registeredStudents && event.registeredStudents.includes(currentUser.name);
        const isFull = event.registeredStudents && event.registeredStudents.length >= event.people;
        
                const registeredCount = event.registeredStudents ? event.registeredStudents.length : 0;
        
        if (isRegistered) {
            buttonHtml = `<button class="register-btn registered" disabled>✓ Вы зарегистрированы (${registeredCount}/${event.people})</button>`;
        } else if (isFull) {
            buttonHtml = `<button class="register-btn" disabled>Мест нет (${event.people}/${event.people})</button>`;
        } else {
            buttonHtml = `<button class="register-btn" data-event-id="${event.id}">Зарегистрироваться (${registeredCount}/${event.people})</button>`;
        }
    }
    
        // Список зарегистрированных - показываем только преподавателю
    let registeredListHtml = '';
    if (currentUser && currentUser.role === 'teacher' && event.registeredStudents && event.registeredStudents.length > 0) {
        const studentsList = event.registeredStudents.join(', ');
        registeredListHtml = `
            <div class="registered-list">
                <strong>📋 Зарегистрированные ученики (${event.registeredStudents.length}/${event.people}):</strong>
                ${studentsList}
            </div>
        `;
    }
    
    const commentHtml = event.comment ? 
        `<div class="event-comment">${escapeHtml(event.comment)}</div>` : '';
    
    return `
        <div class="event-card" data-id="${event.id}">
            <div class="event-title">${escapeHtml(event.title)}</div>
            <div class="event-info">
                <strong>👤 Преподаватель:</strong> ${escapeHtml(event.teacherName || 'Неизвестно')}
            </div>
            <div class="event-info">
                <strong>👥 Требуется:</strong> ${event.people} чел.
            </div>
            <div class="event-info">
                <strong>📅 Дата:</strong> ${formattedDate}
            </div>
            <div class="event-info">
                <strong>📍 Место:</strong> ${escapeHtml(event.location)}
            </div>
            ${commentHtml}
            ${registeredListHtml}
            ${buttonHtml}
            ${actionsHtml}
        </div>
    `;
}

// Обработка регистрации
function handleRegistration(e) {
    if (!currentUser || currentUser.role !== 'student') {
        showNotification('Только ученики могут регистрироваться', 'error');
        return;
    }
    
    const eventId = e.target.dataset.eventId;
    const event = events.find(ev => ev.id === eventId);
    
    if (!event) {
        showNotification('Мероприятие не найдено', 'error');
        return;
    }
    
    if (!event.registeredStudents) {
        event.registeredStudents = [];
    }
    
    if (event.registeredStudents.includes(currentUser.name)) {
        showNotification('Вы уже зарегистрированы на это мероприятие', 'warning');
        return;
    }
    
    if (event.registeredStudents.length >= event.people) {
        showNotification('К сожалению, все места уже заняты', 'error');
        return;
    }
    
    event.registeredStudents.push(currentUser.name);
    
    database.ref('events/' + eventId + '/registeredStudents').set(event.registeredStudents)
        .then(() => {
            showNotification('Вы успешно зарегистрировались!', 'success');
        })
        .catch((error) => {
            showNotification('Ошибка при регистрации: ' + error.message, 'error');
        });
}

// Экранирование HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показ уведомления
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');
    
    switch(type) {
        case 'error':
            notification.style.background = '#f56565';
            break;
        case 'warning':
            notification.style.background = '#ed8936';
            break;
        default:
            notification.style.background = '#48bb78';
    }
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}
