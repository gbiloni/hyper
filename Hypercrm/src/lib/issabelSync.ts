import { spawn } from "child_process";
import { randomBytes } from "crypto";

// Empuja altas/bajas de extensiones y colas hacia Issabel (sip01.hyperisp.com.ar)
// vía SSH, usando una clave dedicada restringida por forced-command
// (~/.ssh/authorized_keys del usuario hypercrm-sync solo puede ejecutar
// /opt/hypercrm/sync-telefonia.sh -- ver ese script para el detalle server-side
// y issabel-sip01-hyperisp.md / hypercrm-meta-app-review.md para el contexto).
//
// Nunca se arma un comando de shell: los argumentos van como array a spawn()
// (sin shell intermedio) y el subcomando + argumentos no sensibles viajan
// como el "comando remoto" de ssh; los datos sensibles/multilínea (secret,
// lista de miembros) van por stdin. Las validaciones de formato son la
// primera línea de defensa (mejor UX, error claro); el script remoto vuelve
// a validar todo -- nunca confiar solo en esta capa.

const SSH_HOST = process.env.ISSABEL_SSH_HOST;
const SSH_USER = process.env.ISSABEL_SSH_USER;
const SSH_KEY_PATH = process.env.ISSABEL_SSH_KEY_PATH;

const EXT_RE = /^[0-9]{3,6}$/;
const SECRET_RE = /^[A-Za-z0-9]{10,64}$/;
const QUEUE_RE = /^[a-z][a-z0-9_-]{1,31}$/;
const STRATEGIES = ["ringall", "leastrecent", "fewestcalls", "random", "rrmemory", "linear", "wrandom"] as const;
export type QueueStrategy = (typeof STRATEGIES)[number];

export function isValidExtension(v: string): boolean {
  return EXT_RE.test(v);
}
export function isValidQueueName(v: string): boolean {
  return QUEUE_RE.test(v);
}
export function isValidStrategy(v: string): v is QueueStrategy {
  return (STRATEGIES as readonly string[]).includes(v);
}

class IssabelSyncError extends Error {}

function runRemote(remoteCommand: string, stdinData: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!SSH_HOST || !SSH_USER || !SSH_KEY_PATH) {
      reject(new IssabelSyncError("Falta configurar ISSABEL_SSH_HOST/USER/KEY_PATH en el servidor."));
      return;
    }

    const child = spawn("ssh", [
      "-i", SSH_KEY_PATH,
      "-o", "BatchMode=yes",
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "ConnectTimeout=8",
      `${SSH_USER}@${SSH_HOST}`,
      remoteCommand,
    ]);

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new IssabelSyncError("Tiempo agotado esperando respuesta de Issabel."));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new IssabelSyncError(`No se pudo conectar a Issabel: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new IssabelSyncError(stderr.trim() || `sync-telefonia falló (code ${code})`));
        return;
      }
      resolve(stdout.trim());
    });

    child.stdin.write(stdinData);
    child.stdin.end();
  });
}

export async function syncExtensionUpsert(extension: string, secret: string): Promise<void> {
  if (!isValidExtension(extension)) throw new IssabelSyncError("Interno inválido (3 a 6 dígitos).");
  if (!SECRET_RE.test(secret)) throw new IssabelSyncError("Secret inválido.");
  await runRemote(`ext-upsert ${extension}`, secret + "\n");
}

export async function syncExtensionDelete(extension: string): Promise<void> {
  if (!isValidExtension(extension)) throw new IssabelSyncError("Interno inválido (3 a 6 dígitos).");
  await runRemote(`ext-delete ${extension}`, "");
}

export async function syncQueueUpsert(
  queue: string,
  strategy: string,
  timeoutSeconds: number,
  memberExtensions: string[]
): Promise<void> {
  if (!isValidQueueName(queue)) throw new IssabelSyncError("Nombre de cola inválido (minúsculas, números, - o _).");
  if (!isValidStrategy(strategy)) throw new IssabelSyncError("Estrategia inválida.");
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 5 || timeoutSeconds > 300) {
    throw new IssabelSyncError("Timeout inválido (entre 5 y 300 segundos).");
  }
  for (const ext of memberExtensions) {
    if (!isValidExtension(ext)) throw new IssabelSyncError(`Miembro inválido: ${ext}`);
  }
  await runRemote(`queue-upsert ${queue} ${strategy} ${timeoutSeconds}`, memberExtensions.join("\n") + "\n");
}

export async function syncQueueDelete(queue: string): Promise<void> {
  if (!isValidQueueName(queue)) throw new IssabelSyncError("Nombre de cola inválido.");
  await runRemote(`queue-delete ${queue}`, "");
}

// Genera un secret aleatorio alfanumérico apto para SIP (cumple SECRET_RE).
export function generateSipSecret(length = 24): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}
