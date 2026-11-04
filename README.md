# 🎯 Mis Metas

Aplicación web para proponerte metas, registrar cada día que cumples con ellas y ver tu progreso en un calendario.

Hecha con **Next.js 16**, **React 19** y **TypeScript**.

## Funciones

- **Agregar, editar y eliminar metas** con nombre, descripción, color, fecha de inicio y fin
  (atajos: 30 días, 3 meses, 6 meses, 1 año, este año).
- **Días a cumplir configurables**: todos los días del periodo o menos (ej: 3 veces por semana).
- **Botón "✅ Hoy cumplí"** que va llenando la barra de progreso (se puede deshacer).
- **Estadísticas**: porcentaje, días cumplidos, días sin cumplir, racha actual, mejor racha y lo que falta.
- **Calendario mensual**: cada día se ve como cumplido ✓, sin cumplir ✕, pendiente o futuro.
  Puedes hacer clic en cualquier día pasado para marcarlo si se te olvidó, quitar la marca o dejar una nota 📝.
- **Resumen anual** con los 12 meses para ver de un vistazo cuánto avanzaste.
- **Exportar / importar** una copia de seguridad en JSON.

## ¿Dónde se guardan los datos?

En el `localStorage` del navegador: no se necesita base de datos ni servidor.
Los datos se quedan en ese navegador y en ese dispositivo. Usa **Exportar** para hacer copias de seguridad
o para pasar tus metas a otro navegador.

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

La forma más fácil es [Vercel](https://vercel.com): importa este repositorio de GitHub y despliega con la
configuración por defecto de Next.js.

## Estructura

```
app/            Página principal, layout y estilos globales
components/     Componentes de React (tarjetas, calendario, diálogos…)
hooks/          useGoals (estado + localStorage), useToday, useToast
lib/            Lógica pura: fechas, estadísticas de metas, copias de seguridad
public/         Ícono
version-html/   Primera versión en HTML/CSS/JS puro (sin dependencias)
```
