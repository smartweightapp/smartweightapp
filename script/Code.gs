/**
 * ════════════════════════════════════════════════════════════════
 *  VitaTrack — Google Apps Script Backend
 *  Archivo: Code.gs
 * ════════════════════════════════════════════════════════════════
 *
 *  INSTRUCCIONES DE DESPLIEGUE:
 *  1. Ve a https://script.google.com y crea un nuevo proyecto.
 *  2. Pega este código en el editor (reemplaza el contenido de Code.gs).
 *  3. Haz clic en "Implementar" → "Nueva implementación".
 *  4. Tipo: "Aplicación web".
 *  5. Ejecutar como: "Yo" (tu cuenta Google).
 *  6. Quién tiene acceso: "Cualquier usuario" (para uso anónimo/público).
 *  7. Haz clic en "Implementar" y copia la URL generada.
 *  8. Pega esa URL en la sección de Configuración de VitaTrack.
 *
 *  ESTRUCTURA DE LA HOJA DE CÁLCULO:
 *  El script creará automáticamente las siguientes hojas:
 *    - Profiles   → datos de perfil de los usuarios A y B
 *    - Foods      → registro de comidas
 *    - Exercises  → registro de ejercicios
 * ════════════════════════════════════════════════════════════════
 */

// ── ID DE LA HOJA DE CÁLCULO ────────────────────────────────────
// Opción A: Deja en blanco para que el script cree una nueva hoja automáticamente.
// Opción B: Pega aquí el ID de una hoja existente (lo encuentras en la URL de Google Sheets).
const SPREADSHEET_ID = '';

// ── NOMBRE DEL SPREADSHEET (si se crea automáticamente) ─────────
const SPREADSHEET_NAME = 'VitaTrack — Health Data';

// ════════════════════════════════════════════════════════════════
//  HANDLERS PRINCIPALES
// ════════════════════════════════════════════════════════════════

/**
 * GET Handler — Recupera datos de la hoja de cálculo.
 * Parámetros de consulta:
 *   ?action=ping                          → Prueba de conexión
 *   ?action=getProfile&user=A             → Perfil del usuario
 *   ?action=getEntries&user=A&date=YYYY-MM-DD → Comidas y ejercicios del día
 *   ?action=getAllEntries&user=A           → Todos los registros del usuario
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    let result;

    switch (action) {
      case 'ping':
        result = { status: 'ok', timestamp: new Date().toISOString() };
        break;

      case 'getProfile':
        result = getProfile(params.user);
        break;

      case 'getEntries':
        result = getEntries(params.user, params.date);
        break;

      case 'getAllEntries':
        result = getAllEntries(params.user);
        break;

      default:
        result = { error: 'Acción no reconocida', action };
    }

    return buildResponse(result);

  } catch (err) {
    return buildResponse({ error: err.message, stack: err.stack });
  }
}

/**
 * POST Handler — Guarda datos en la hoja de cálculo.
 * Body JSON:
 *   { action: 'saveProfile',  user: 'A', profile: {...} }
 *   { action: 'addFood',      user: 'A', entry: {...} }
 *   { action: 'addExercise',  user: 'A', entry: {...} }
 *   { action: 'deleteFood',   user: 'A', id: '...' }
 *   { action: 'deleteExercise', user: 'A', id: '...' }
 */
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;

    switch (action) {
      case 'saveProfile':
        result = saveProfile(body.user, body.profile);
        break;

      case 'addFood':
        result = addFood(body.user, body.entry);
        break;

      case 'addExercise':
        result = addExercise(body.user, body.entry);
        break;

      case 'deleteFood':
        result = deleteRow('Foods', body.id);
        break;

      case 'deleteExercise':
        result = deleteRow('Exercises', body.id);
        break;

      default:
        result = { error: 'Acción no reconocida', action };
    }

    return buildResponse(result);

  } catch (err) {
    return buildResponse({ error: err.message, stack: err.stack });
  }
}

// ════════════════════════════════════════════════════════════════
//  SPREADSHEET HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Obtiene o crea el Spreadsheet y garantiza que las hojas existan.
 */
function getSpreadsheet() {
  let ss;

  if (SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    // Buscar en el Drive si ya existe uno con ese nombre
    const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(SPREADSHEET_NAME);
      Logger.log('Nuevo Spreadsheet creado: ' + ss.getId());
    }
  }

  ensureSheets(ss);
  return ss;
}

/**
 * Crea las hojas necesarias si no existen y añade encabezados.
 */
function ensureSheets(ss) {
  const sheets = {
    'Profiles': ['user', 'name', 'sex', 'age', 'weight', 'height', 'activity', 'updatedAt'],
    'Foods':    ['id', 'user', 'date', 'name', 'ingredients', 'calories', 'portions', 'totalCalories', 'meal', 'createdAt'],
    'Exercises':['id', 'user', 'date', 'name', 'duration', 'caloriesBurned', 'intensity', 'notes', 'createdAt']
  };

  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length)
           .setValues([headers])
           .setFontWeight('bold')
           .setBackground('#1a2332')
           .setFontColor('#B5FF4D');
      sheet.setFrozenRows(1);
    }
  }

  // Eliminar Sheet1 por defecto si existe y está vacía
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1');
  if (defaultSheet && defaultSheet.getLastRow() <= 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }
}

/**
 * Obtiene una hoja por nombre.
 */
function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

/**
 * Convierte todas las filas de una hoja (excepto encabezado) en array de objetos.
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ════════════════════════════════════════════════════════════════
//  PROFILE FUNCTIONS
// ════════════════════════════════════════════════════════════════

function getProfile(user) {
  if (!user) return { error: 'user requerido' };
  const sheet   = getSheet('Profiles');
  const records = sheetToObjects(sheet);
  const profile = records.find(r => r.user === user);
  return { profile: profile || null };
}

function saveProfile(user, profile) {
  if (!user || !profile) return { error: 'Datos incompletos' };

  const sheet   = getSheet('Profiles');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0]; // ['user','name','sex','age','weight','height','activity','updatedAt']

  const row = [
    user,
    profile.name     || '',
    profile.sex      || 'male',
    profile.age      || 0,
    profile.weight   || 0,
    profile.height   || 0,
    profile.activity || 1.55,
    new Date().toISOString()
  ];

  // Buscar si ya existe
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true, action: 'updated' };
    }
  }

  // Insertar nuevo
  sheet.appendRow(row);
  return { success: true, action: 'inserted' };
}

// ════════════════════════════════════════════════════════════════
//  FOOD FUNCTIONS
// ════════════════════════════════════════════════════════════════

function addFood(user, entry) {
  if (!user || !entry) return { error: 'Datos incompletos' };
  const sheet = getSheet('Foods');

  const row = [
    entry.id             || Date.now().toString(),
    user,
    entry.date           || new Date().toISOString().split('T')[0],
    entry.name           || '',
    entry.ingredients    || '',
    entry.calories       || 0,
    entry.portions       || 1,
    entry.totalCalories  || entry.calories || 0,
    entry.meal           || '',
    new Date().toISOString()
  ];

  sheet.appendRow(row);
  return { success: true, id: row[0] };
}

function getFoodsByUser(user) {
  const sheet   = getSheet('Foods');
  const records = sheetToObjects(sheet);
  return records.filter(r => String(r.user) === String(user));
}

// ════════════════════════════════════════════════════════════════
//  EXERCISE FUNCTIONS
// ════════════════════════════════════════════════════════════════

function addExercise(user, entry) {
  if (!user || !entry) return { error: 'Datos incompletos' };
  const sheet = getSheet('Exercises');

  const row = [
    entry.id             || Date.now().toString(),
    user,
    entry.date           || new Date().toISOString().split('T')[0],
    entry.name           || '',
    entry.duration       || 0,
    entry.caloriesBurned || 0,
    entry.intensity      || 'Media',
    entry.notes          || '',
    new Date().toISOString()
  ];

  sheet.appendRow(row);
  return { success: true, id: row[0] };
}

function getExercisesByUser(user) {
  const sheet   = getSheet('Exercises');
  const records = sheetToObjects(sheet);
  return records.filter(r => String(r.user) === String(user));
}

// ════════════════════════════════════════════════════════════════
//  COMBINED QUERIES
// ════════════════════════════════════════════════════════════════

/**
 * Retorna comidas y ejercicios de un usuario para una fecha específica.
 */
function getEntries(user, date) {
  if (!user) return { error: 'user requerido' };

  const foods     = getFoodsByUser(user).filter(f =>
    !date || String(f.date).startsWith(date)
  );
  const exercises = getExercisesByUser(user).filter(e =>
    !date || String(e.date).startsWith(date)
  );

  return { foods, exercises };
}

/**
 * Retorna TODOS los registros de un usuario (historial completo).
 */
function getAllEntries(user) {
  if (!user) return { error: 'user requerido' };
  return {
    foods:     getFoodsByUser(user),
    exercises: getExercisesByUser(user)
  };
}

// ════════════════════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════════════════════

/**
 * Elimina una fila de una hoja por ID (columna 1).
 */
function deleteRow(sheetName, id) {
  if (!id) return { error: 'id requerido' };
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, deleted: id };
    }
  }

  return { error: 'Registro no encontrado', id };
}

// ════════════════════════════════════════════════════════════════
//  RESPONSE BUILDER
// ════════════════════════════════════════════════════════════════

/**
 * Construye la respuesta JSON con cabeceras CORS para
 * permitir peticiones desde cualquier origen (GitHub Pages, etc.)
 */
function buildResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ════════════════════════════════════════════════════════════════
//  UTILITY — ejecutar manualmente para probar
// ════════════════════════════════════════════════════════════════

/**
 * Función de prueba: ejecútala manualmente desde el editor
 * para verificar que todo funciona antes de desplegar.
 */
function testSetup() {
  Logger.log('=== TEST SETUP ===');

  // Crear/acceder al spreadsheet
  const ss = getSpreadsheet();
  Logger.log('Spreadsheet: ' + ss.getName() + ' (' + ss.getId() + ')');
  Logger.log('URL: ' + ss.getUrl());

  // Guardar perfiles de prueba
  const resA = saveProfile('A', { name:'Ana García', sex:'female', age:28, weight:62, height:165, activity:1.55 });
  const resB = saveProfile('B', { name:'Carlos López', sex:'male', age:34, weight:80, height:178, activity:1.725 });
  Logger.log('Perfil A: ' + JSON.stringify(resA));
  Logger.log('Perfil B: ' + JSON.stringify(resB));

  // Agregar comida de prueba
  const food = addFood('A', {
    id: 'test_' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    name: 'Avena con frutas',
    ingredients: 'Avena 60g, Plátano 1, Leche 200ml',
    calories: 340,
    portions: 1,
    totalCalories: 340,
    meal: 'Desayuno'
  });
  Logger.log('Food added: ' + JSON.stringify(food));

  // Agregar ejercicio de prueba
  const ex = addExercise('A', {
    id: 'test_ex_' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    name: 'Carrera',
    duration: 30,
    caloriesBurned: 280,
    intensity: 'Media',
    notes: '5km aprox.'
  });
  Logger.log('Exercise added: ' + JSON.stringify(ex));

  // Leer todo
  const entries = getEntries('A', new Date().toISOString().split('T')[0]);
  Logger.log('Entries today: ' + JSON.stringify(entries));

  Logger.log('=== TEST COMPLETADO ✓ ===');
  Logger.log('Copia este ID de Spreadsheet: ' + ss.getId());
}
