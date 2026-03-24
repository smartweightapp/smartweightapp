# VitaTrack — Guía de Despliegue

## 📁 Archivos incluidos

| Archivo    | Descripción |
|------------|-------------|
| `index.html` | Aplicación web completa (HTML + CSS + JS en un solo archivo) |
| `Code.gs`    | Backend de Google Apps Script para persistencia en Google Sheets |

---

## 🚀 Parte 1 — Desplegar en GitHub Pages

1. Crea un repositorio en GitHub (puede ser público o privado con Pages habilitado).
2. Sube `index.html` a la raíz del repositorio.
3. Ve a **Settings → Pages** en tu repositorio.
4. En *Source*, selecciona la rama `main` y la carpeta `/ (root)`.
5. Haz clic en **Save**. Tu app estará disponible en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

---

## 🔗 Parte 2 — Configurar Google Apps Script (Backend)

### Paso 1 — Crear el proyecto

1. Ve a [https://script.google.com](https://script.google.com)
2. Haz clic en **Nuevo proyecto**
3. Borra el contenido de `Code.gs` y pega todo el contenido del archivo `Code.gs` incluido en este paquete.

### Paso 2 — Probar localmente

1. Selecciona la función `testSetup` en el desplegable del editor.
2. Haz clic en **Ejecutar**.
3. Revisa los **Registros de ejecución** (panel inferior) — deberías ver el ID del Spreadsheet creado y confirmaciones de inserción.

### Paso 3 — Desplegar como Web App

1. Haz clic en **Implementar → Nueva implementación**
2. Haz clic en el ícono de engranaje ⚙ junto a "Tipo" y selecciona **Aplicación web**
3. Configura:
   - **Descripción:** `VitaTrack API v1`
   - **Ejecutar como:** Tu cuenta de Google
   - **Quién tiene acceso:** `Cualquier usuario` *(necesario para que GitHub Pages pueda llamar a la API)*
4. Haz clic en **Implementar**
5. **Copia la URL** que aparece (tiene la forma `https://script.google.com/macros/s/XXXXXXXXXX/exec`)

### Paso 4 — Conectar la app

1. Abre tu VitaTrack desplegada en GitHub Pages.
2. Haz clic en el ícono ⚙ (Configuración) en la cabecera.
3. Pega la URL copiada en el campo **URL Google Apps Script**.
4. Haz clic en **Probar conexión** — deberías ver "Conexión exitosa ✓".
5. Configura los perfiles A y B y guarda.

---

## 📊 Estructura de Google Sheets generada automáticamente

```
📄 VitaTrack — Health Data
├── 📋 Profiles     → Datos de perfil (usuario A y B)
├── 🍽️ Foods        → Registro de comidas de ambos usuarios
└── 🏃 Exercises    → Registro de ejercicios de ambos usuarios
```

### Hoja `Profiles`
| user | name | sex | age | weight | height | activity | updatedAt |
|------|------|-----|-----|--------|--------|----------|-----------|
| A | Ana García | female | 28 | 62 | 165 | 1.55 | 2026-03-24T... |

### Hoja `Foods`
| id | user | date | name | ingredients | calories | portions | totalCalories | meal | createdAt |
|----|------|------|------|-------------|----------|----------|---------------|------|-----------|

### Hoja `Exercises`
| id | user | date | name | duration | caloriesBurned | intensity | notes | createdAt |
|----|------|------|------|----------|----------------|-----------|-------|-----------|

---

## 🧮 Fórmulas implementadas

### IMC (Índice de Masa Corporal)
```
IMC = peso(kg) / altura(m)²
```
| Rango | Categoría |
|-------|-----------|
| < 18.5 | Bajo peso |
| 18.5 – 24.9 | Normal |
| 25 – 29.9 | Sobrepeso |
| ≥ 30 | Obesidad |

### TDEE — Mifflin-St Jeor
```
Hombres: BMR = (10 × kg) + (6.25 × cm) − (5 × años) + 5
Mujeres: BMR = (10 × kg) + (6.25 × cm) − (5 × años) − 161

TDEE = BMR × Factor de actividad
```
| Nivel | Factor |
|-------|--------|
| Sedentario | × 1.2 |
| Ligeramente activo | × 1.375 |
| Moderadamente activo | × 1.55 |
| Muy activo | × 1.725 |
| Extremadamente activo | × 1.9 |

---

## ⚠️ Nota sobre CORS

Google Apps Script usa `no-cors` para peticiones POST desde dominios externos.
Las respuestas de las operaciones de escritura (POST) no son accesibles desde el navegador directamente, pero los datos **sí se guardan** en Sheets.

Para lectura (GET), el script responde con JSON accesible directamente.

Si necesitas confirmación de escritura en tiempo real, considera usar una API key con el endpoint estándar de Sheets API v4.

---

## 🔒 Seguridad

- Los datos se guardan en **tu propia cuenta de Google**.
- La app funciona 100% offline con localStorage como fallback.
- No hay servidor intermediario — la comunicación es directamente entre el navegador y tu Google Apps Script.
- Para uso privado, puedes cambiar "Quién tiene acceso" a "Solo yo" y agregar autenticación con OAuth.
