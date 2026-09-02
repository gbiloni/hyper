// A diferencia de global-error.tsx, not-found.tsx se renderiza DENTRO del
// layout raíz (que ya pone <html><body>), así que acá solo va el contenido.
export default function NotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>Página no encontrada.</h2>
      <a href="/hypercrm" style={{ display: "inline-block", marginTop: "1rem" }}>
        Volver al inicio
      </a>
    </div>
  );
}
