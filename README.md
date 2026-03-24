# VitaTrack — Guía de Despliegue Seguro

## 📁 Estructura del repositorio

```
vitatrack/
├── index.html                        ← App completa (con token placeholder)
├── Code.gs                           ← Backend Google Apps Script
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml                ← Pipeline CI/CD con inyección de secretos
```

---

## 🔒 Cómo funciona la seguridad

```
Repo (git)                GitHub Actions              GitHub Pages (live)
─────────────────         ──────────────────          ──────────────────
index.html                Secrets store:              dist/index.html
  url:'__APPS_       →      APPS_SCRIPT_URL      →      url:'https://script.
  SCRIPT_URL__'         (solo visible para admins)       google.com/macros/...'
  (token literal)                                    (URL real, solo en artefacto)
```

La URL de Apps Script **nunca aparece en git**. Solo existe en:
- El almacén cifrado de Secrets de GitHub
- El artefacto de Pages generado durante el deploy

---

## 🚀 Setup paso a paso

### Paso 1 — Configurar Google Apps Script

1. Ir a https://script.google.com → **Nuevo proyecto**
2. Pegar el contenido de `Code.gs`
3. Ejecutar la función `testSetup()` para verificar que crea el Spreadsheet
4. **Implementar → Nueva implementación:**
   - Tipo: `Aplicación web`
   - Ejecutar como: `Yo`
   - Quién tiene acceso: `Cualquier usuario`
5. Copiar la URL (formato `https://script.google.com/macros/s/AKfy.../exec`)

### Paso 2 — Crear el repositorio en GitHub

```bash
git init
git add index.html Code.gs README.md .github/
git commit -m "feat: initial VitaTrack setup"
git remote add origin https://github.com/TU-USUARIO/vitatrack.git
git push -u origin main
```

> ⚠️ Verificar que `index.html` contiene `__APPS_SCRIPT_URL__` (el token, NO la URL real) antes del push.

### Paso 3 — Registrar secretos en GitHub

Settings → Secrets and variables → Actions → **New repository secret**

| Secret name | Value | Requerido |
|---|---|---|
| `APPS_SCRIPT_URL` | URL completa del Apps Script | ✅ Sí |
| `PROFILE_A_NAME` | Nombre del Usuario A (ej: Ana) | ❌ Opcional |
| `PROFILE_B_NAME` | Nombre del Usuario B (ej: Carlos) | ❌ Opcional |

### Paso 4 — Habilitar GitHub Pages

Settings → Pages → Source: **GitHub Actions** (no "Deploy from a branch")

### Paso 5 — Primer deploy

El workflow se dispara automáticamente con cada push a `main`.
Para deploy manual: Actions → Deploy VitaTrack → **Run workflow**

---

## ✅ Auditoría de seguridad automática

En cada deploy el workflow verifica que el token fue reemplazado:

```
✓ APPS_SCRIPT_URL secret is present
✓ Token __APPS_SCRIPT_URL__ substituted
✓ Security audit passed
```

Si el secret no está configurado, el deploy **falla antes de publicar**:
```
::error::SECURITY: Token __APPS_SCRIPT_URL__ was NOT replaced.
```

---

## 🔄 Actualizar la URL de Apps Script

1. Settings → Secrets → `APPS_SCRIPT_URL` → **Update**
2. Actions → **Run workflow**
El artefacto se redespliega con la nueva URL automáticamente.

---

## 🧮 Fórmulas

### IMC
```
IMC = peso(kg) / altura(m)²
```

### TDEE — Mifflin-St Jeor
```
Hombres: BMR = (10 × kg) + (6.25 × cm) − (5 × años) + 5
Mujeres: BMR = (10 × kg) + (6.25 × cm) − (5 × años) − 161
TDEE = BMR × factor_actividad
```
| Nivel | Factor |
|---|---|
| Sedentario | × 1.2 |
| Ligeramente activo | × 1.375 |
| Moderadamente activo | × 1.55 |
| Muy activo | × 1.725 |
| Extremadamente activo | × 1.9 |

---

## 📊 Google Sheets (auto-generado)

```
Profiles   → user | name | sex | age | weight | height | activity | updatedAt
Foods      → id | user | date | name | ingredients | calories | portions | totalCalories | meal | createdAt
Exercises  → id | user | date | name | duration | caloriesBurned | intensity | notes | createdAt
```
