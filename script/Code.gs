// ─────────────────────────────────────────────────────────────────
// SERVICIOS DE SALUD — Apps Script backend
// Columnas desde C (índice 0 relativo a START_COL=3):
//   C(0)=Folio   D(1)=Fecha    E(2)=Nombre   F(3)=Prom    G(4)=Tel
//   H(5)=Calle   I(6)=Colonia  J(7)=Municipio
//   K(8)=Edad
//   L(9)=Diabetes  M(10)=Presion   ← NUEVAS
//   N(11)=Costo    O(12)=FPago    P(13)=Anticipo  Q(14)=Rbdo  R(15)=Deuda
//   S(16)=vacía
//   T(17)-W(20)=OD(ESF/CYL/EJE/ADD)
//   X(21)-AA(24)=OI(ESF/CYL/EJE/ADD)
//   AB(25)=DIP   AC(26)=ALT
//   AD(27)=Varilla  AE(28)=Aro  AF(29)=Puente
//   AG(30)=AntOD  AH(31)=AntOI  AI(32)=ActOD  AJ(33)=ActOI
//   AK(34)=VISION  AL(35)=FILTRO  AM(36)=AR  AN(37)=ARMAZON  AO(38)=MEDIDAS
//   AP(39)=vacía
//   AQ(40)=LAB  AR(41)=FOL  AS(42)=MICAS  AT(43)=BISEL  AU(44)=MAQ
//   AV(45)=ARMAZON2  AW(46)=ACC
//   AX(47)=$ SUM   AY(48)=Timestamp   AZ(49)=Utilidad
// ─────────────────────────────────────────────────────────────────

var SHEET_ID       = '1SWfzIJLrA5I9-oqXLBl-oIptJUpzd9YIsT5jASGb0R0';
var SHEET_NAME     = 'Control';
var START_COL      = 3;   // C
var DATA_START_ROW = 4;   // Rows 1-2=headers, 3=blank/summary, 4+=data

var HEADERS = [
  'Folio','Fecha','Nombre del Px','Prom','Teléfono Px',  // C-G (0-4)
  'Calle y Numero','Colonia','Municipio',                 // H-J (5-7)
  'Edad',                                                  // K   (8)
  'Diabetes','Presion',                                    // L-M (9-10) NUEVAS
  'Costo Lente','Forma de Pago','Anticipo','Rbdo','Deuda', // N-R (11-15)
  '',                                                       // S   (16) vacía
  'ESF','CYL','EJE','ADD',   // OD: T-W (17-20)
  'ESF','CYL','EJE','ADD',   // OI: X-AA (21-24)
  'DIP','ALT',               // AB-AC (25-26)
  'VARILLA','ARO','PUENTE',  // AD-AF (27-29)
  'OD','OI','OD','OI',       // Ant AG-AH, Act AI-AJ (30-33)
  'VISION','FILTRO','AR','ARMAZON','MEDIDAS', // AK-AO (34-38)
  '',                        // AP (39) vacía
  'LAB','FOL','MICAS','BISEL','MAQ','ARMAZON','ACC', // AQ-AW (40-46)
  '$','Timestamp','Utilidad' // AX-AZ (47-49)
];

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function ensureHeaders(sheet) {
  if (!sheet) return;
  if (sheet.getLastRow() > 0) return;
  var len = HEADERS.length;
  var g1 = [];
  for (var i = 0; i < len; i++) g1.push('');
  g1[17] = 'OD';
  g1[21] = 'OI';
  g1[27] = 'MEDIDAS ARMAZÓN';
  g1[30] = 'ANTERIOR';
  g1[32] = 'ACTUAL';
  g1[40] = 'LABORATORIO';
  sheet.getRange(1, START_COL, 1, len).setValues([g1])
    .setFontWeight('bold').setBackground('#1a7a4a').setFontColor('#ffffff');
  sheet.getRange(2, START_COL, 1, len).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#2d9e62').setFontColor('#ffffff');
  sheet.setFrozenRows(2);
}

function buildRow(d, row) {
  return [
    // C-J: datos paciente
    d['folio']||'', d['fecha']||'', d['nombre del px']||'', d['prom']||'',
    d['teléfono px']||'', d['calle y numero']||'', d['colonia']||'', d['municipio']||'',
    // K: Edad
    d['edad']||'',
    // L-M: Diabetes, Presion (NUEVAS)
    d['diabetes']||'', d['presion']||'',
    // N-R: Pago
    d['costo lente']||0, d['forma de pago']||'', d['anticipo']||0, d['rbdo']||0, d['deuda']||0,
    // S: vacía
    '',
    // T-W: OD
    d['od_esf']||'', d['od_cyl']||'', d['od_eje']||'', d['od_add']||'',
    // X-AA: OI
    d['oi_esf']||'', d['oi_cyl']||'', d['oi_eje']||'', d['oi_add']||'',
    // AB-AC: DIP, ALT
    d['dip']||'', d['alt']||'',
    // AD-AF: Varilla, Aro, Puente
    d['varilla']||'', d['aro']||'', d['puente']||'',
    // AG-AJ: Anterior OD/OI, Actual OD/OI
    d['ant_od']||'', d['ant_oi']||'', d['act_od']||'', d['act_oi']||'',
    // AK-AO: Vision, Filtro, AR, Armazon, Medidas(color)
    d['vision']||'', d['filtro']||'', d['ar']||'', d['armazon']||'', d['medidas']||'',
    // AP: vacía
    '',
    // AQ-AW: Lab
    d['lab']||'', d['fol_lab']||'',
    d['micas']||0, d['bisel']||0, d['maq']||0, d['armazon2']||'', d['acc']||'',
    // AX: =SUM(AS:AW)
    '=SUM(AS'+row+':AW'+row+')',
    // AY: timestamp
    new Date().toLocaleString('es-MX'),
    // AZ: utilidad =+N-AX
    '=+N'+row+'-AX'+row
  ];
}

function doPost(e) {
  try {
    var data  = JSON.parse(e.postData.contents);
    var sheet = getSheet();
    if (!sheet) return json({ ok:false, error:'No se pudo obtener la hoja "'+SHEET_NAME+'"' });
    ensureHeaders(sheet);
    var nextRow = sheet.getLastRow() + 1;
    if (nextRow < DATA_START_ROW) nextRow = DATA_START_ROW;
    var row = buildRow(data, nextRow);
    sheet.getRange(nextRow, START_COL, 1, row.length).setValues([row]);
    // Force column C (folio) to plain text so Sheets never converts it to a date
    sheet.getRange(nextRow, START_COL).setNumberFormat('@STRING@');
    return json({ ok:true, row:nextRow });
  } catch(err) {
    return json({ ok:false, error:String(err.message||err) });
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action !== 'history') return json({ ok:true, status:'Servicios de Salud API activa' });

    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return json({ ok:true, rows:[], note:'Hoja no encontrada' });

    var lastRow = sheet.getLastRow();
    if (lastRow < DATA_START_ROW) return json({ ok:true, rows:[] });

    var lastCol = sheet.getLastColumn();
    if (lastCol < START_COL) return json({ ok:true, rows:[] });

    var values = sheet.getRange(
      DATA_START_ROW, START_COL,
      lastRow - DATA_START_ROW + 1,
      lastCol - START_COL + 1
    ).getValues();

    // 0-indexed from C
    var colMap = {
      folio:0, fecha:1, nombre:2, prom:3, tel:4,
      calle:5, colonia:6, municipio:7,
      edad:8,
      diabetes:9, presion:10,          // L-M NUEVAS
      costo:11, fpago:12, anticipo:13, rbdo:14, deuda:15,
      // 16 = vacía (S)
      od_esf:17, od_cyl:18, od_eje:19, od_add:20,
      oi_esf:21, oi_cyl:22, oi_eje:23, oi_add:24,
      dip:25, alt:26,
      varilla:27, aro:28, puente:29,
      ant_od:30, ant_oi:31, act_od:32, act_oi:33,
      vision:34, filtro:35, ar_lens:36, armazon:37, medidas:38,
      // 39 = vacía (AP)
      lab:40, fol:41, micas:42, bisel:43, maq:44, armazon2:45, acc:46,
      costo_prod:47, ts:48, utilidad:49
    };

    var tz   = Session.getScriptTimeZone();
    var rows = [];

    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      if (r[0]==='' || r[0]===null || r[0]===undefined) continue;
      // Skip rows where the folio column C looks like a date (bad data)
      var folioVal = r[0];
      if (folioVal instanceof Date) continue;  // date object in column C
      var folioStr = String(folioVal);
      if (/^\d{4}-\d{2}-\d{2}/.test(folioStr)) continue;  // ISO date string

      var obj  = {};
      var keys = Object.keys(colMap);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var idx = colMap[key];
        obj[key] = (idx < r.length && r[idx]!==null && r[idx]!==undefined) ? r[idx] : '';
      }

      if (obj.fecha instanceof Date) {
        obj.fecha = Utilities.formatDate(obj.fecha, tz, 'yyyy-MM-dd');
      } else {
        obj.fecha = String(obj.fecha||'');
      }

      rows.push(obj);
    }

    return json({ ok:true, rows:rows });

  } catch(err) {
    return json({ ok:false, error:String(err.message||err), rows:[] });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
