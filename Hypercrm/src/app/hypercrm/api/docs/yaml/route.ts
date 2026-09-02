import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const yamlPath = path.join(process.cwd(), 'public', 'api3.yaml');
    let fileBuffer: Buffer;
    
    if (fs.existsSync(yamlPath)) {
      fileBuffer = fs.readFileSync(yamlPath);
    } else {
      const fallbackPath = path.join(process.cwd(), '..', 'public', 'api3.yaml');
      if (fs.existsSync(fallbackPath)) {
        fileBuffer = fs.readFileSync(fallbackPath);
      } else {
        return new NextResponse('YAML no encontrado en ' + yamlPath, { status: 404 });
      }
    }

    // Inyectar URL desde variables de entorno
    let yamlString = fileBuffer.toString('utf-8');
    if (process.env.JAVA_API_URL) {
      yamlString = yamlString.replace(
        /url:\s*http:\/\/10\.99\.98\.250:8080\/api3/, 
        `url: ${process.env.JAVA_API_URL}`
      ).replace(
        /url:\s*http:\/\/localhost:8080\/hypermgmt-api3\/api3/,
        `url: ${process.env.JAVA_API_URL}`
      );
    }
    
    return new NextResponse(yamlString, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error al leer el Swagger YAML:', error);
    return new NextResponse('Error interno leyendo el YAML', { status: 500 });
  }
}
