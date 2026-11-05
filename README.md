# 🎯 Mis Metas

Aplicación web para proponerte metas, registrar cada día que cumples con ellas y ver tu progreso en un calendario.

Hecha con **Next.js 16**, **React 19**, **TypeScript** y **Supabase** (base de datos + inicio de sesión).

## Funciones

- **Cuenta propia**: registro e inicio de sesión con correo y contraseña. Cada usuario ve solo sus metas.
- **Agregar, editar y eliminar metas** con nombre, descripción, color, fecha de inicio y fin
  (atajos: 30 días, 3 meses, 6 meses, 1 año, este año).
- **Días a cumplir configurables**: todos los días del periodo o menos (ej: 3 veces por semana).
- **Botón "✅ Hoy cumplí"** que va llenando la barra de progreso (se puede deshacer).
- **Estadísticas**: porcentaje, días cumplidos, días sin cumplir, racha actual, mejor racha y lo que falta.
- **Calendario mensual**: cada día se ve como cumplido ✓, sin cumplir ✕, pendiente o futuro.
  Puedes hacer clic en cualquier día pasado para marcarlo si se te olvidó, quitar la marca o dejar una nota 📝.
- **Resumen anual** con los 12 meses para ver de un vistazo cuánto avanzaste.
- **Exportar / importar** una copia de seguridad en JSON.

## Base de datos (Supabase)

| Tabla | Columnas |
|---|---|
| `metas` | `id`, `nombre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `dias_objetivo`, `color`, `creado_en`, `user_id` |
| `registrosmetas` | `id`, `meta_id` → metas.id, `fecha`, `nota`, `creado_en`, `user_id` |

Cada fila de `registrosmetas` es un día en que se cumplió la meta.

### Configuración (una sola vez)

1. En Supabase → **SQL Editor**, ejecuta [`supabase/politicas.sql`](supabase/politicas.sql)
   (agrega `user_id`, el índice único por meta y día, y las políticas RLS).
2. Copia `.env.example` como `.env.local` y pon tu **Project URL** y tu **Publishable key**
   (Project Settings → API Keys). Nunca uses la secret / service_role key en la app.
3. En Supabase → **Authentication → URL Configuration**, agrega `http://localhost:3000`
   (y luego tu dominio de Vercel) en **Site URL / Redirect URLs** para que funcione el correo de confirmación.

## Cómo ejecutarlo

Requisitos: [Node.js](https://nodejs.org) 20.9 o superior.

```bash
npm install
npm run dev
```

Luego abre <http://localhost:3000>.

Para la versión de producción:

```bash
npm run build
npm start
```

## Publicarlo en internet

La forma más fácil es [Vercel](https://vercel.com): importa este repositorio de GitHub y, en
**Settings → Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Estructura

```
app/            Página principal, layout y estilos globales
components/     Componentes de React (login, tarjetas, calendario, diálogos…)
hooks/          useSession (login), useGoals (datos en Supabase), useToday, useToast
lib/            supabase.ts (cliente), db.ts (consultas), goals.ts y dates.ts (lógica)
supabase/       SQL de seguridad para el SQL Editor
public/         Ícono
version-html/   Primera versión en HTML/CSS/JS puro (sin dependencias)
```
