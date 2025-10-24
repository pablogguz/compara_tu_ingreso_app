export default function AutorTab() {
  return (
    <div className="help-content">
      <h4>Sobre el autor</h4>
      <p>
        Soy Pablo y me dedico a la investigación en economía aplicada. En concreto, trabajo analizando grandes bases de datos administrativas, geoespaciales y encuestas a hogares para entender mejor la sociedad. En mi tiempo libre, me gusta desarrollar proyectos de código abierto y herramientas como esta para hacer los datos más accesibles y útiles para todos.
      </p>

      <div className="author-social-links">
        <a 
          href="https://twitter.com/pablogguz" 
          target="_blank" 
          rel="noopener noreferrer"
          className="social-link"
          aria-label="Twitter"
        >
          <i className="fab fa-twitter"></i>
          <span>Twitter</span>
        </a>
        <a 
          href="https://github.com/pablogguz" 
          target="_blank" 
          rel="noopener noreferrer"
          className="social-link"
          aria-label="GitHub"
        >
          <i className="fab fa-github"></i>
          <span>GitHub</span>
        </a>
        <a 
          href="https://linkedin.com/in/pablogguz" 
          target="_blank" 
          rel="noopener noreferrer"
          className="social-link"
          aria-label="LinkedIn"
        >
          <i className="fab fa-linkedin"></i>
          <span>LinkedIn</span>
        </a>
      </div>
    </div>
  )
}
