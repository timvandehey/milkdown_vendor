import { join } from "path";

const port = process.env.PORT || 3000;

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Serve index.html if pointing at root
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    // Serve files relative to the current directory
    const filePath = join(import.meta.dir, pathname);
    const file = Bun.file(filePath);

    // If file doesn't exist on disk
    if (!(await file.exists())) {
      // If it's a request for a static asset (has a file extension), return 404
      const hasExtension = pathname.split("/").pop().includes(".");
      if (hasExtension) {
        return new Response("Not Found", { status: 404 });
      }

      // Otherwise, fallback to index.html to support SPA routing
      const indexFile = Bun.file(join(import.meta.dir, "index.html"));
      return new Response(indexFile);
    }

    return new Response(file);
  },
});

console.log(`Server running at http://localhost:${port}`);
