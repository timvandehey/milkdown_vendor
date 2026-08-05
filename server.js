import { join } from "path";

const port = process.env.PORT || 3000;

Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Default to /example/index.html if pointing at root
    if (pathname === "/" || pathname === "") {
      pathname = "/example/index.html";
    }

    // Serve files relative to the current directory
    const filePath = join(import.meta.dir, pathname);
    const file = Bun.file(filePath);

    return new Response(file);
  },
});

console.log(`Server running at http://localhost:${port}`);
