      try {
        var t = localStorage.getItem('flygaca:theme');
        if (t === 'cockpit' || t === 'day') {
          document.documentElement.setAttribute('data-theme', t);
          var m = document.querySelector('meta[name="theme-color"]');
          if (m) m.setAttribute('content', t === 'day' ? '#F5F2ED' : '#121212');
        }
      } catch (e) {}

        // The shell is the home hero; on any other route the SPA fallback still
        // serves this file, so drop the shell there to avoid a wrong-page flash.
        // `/ar` + `/ar/` are the Arabic home snapshot (main.tsx folds them onto
        // `/?lang=ar`), so they keep the hero too.
        var p = location.pathname;
        if (p !== '/' && p !== '/index.html' && p !== '/ar' && p !== '/ar/') {
          var s = document.getElementById('app-shell');
          if (s) s.remove();
        }
