import { PGDATA } from "./fs.js";
import EmPostgresFactory, { type EmPostgres } from "../release/postgres.js";
import loadPgShare from "../release/share.js";
import { nodeValues } from "./utils.js";

const PGWASM_URL = new URL("../release/postgres.wasm", import.meta.url);
const PGSHARE_URL = new URL("../release/share.data", import.meta.url);

export const DIRS = [
  "global",
  "pg_wal",
  "pg_wal/archive_status",
  "pg_commit_ts",
  "pg_dynshmem",
  "pg_notify",
  "pg_serial",
  "pg_snapshots",
  "pg_subtrans",
  "pg_twophase",
  "pg_multixact",
  "pg_multixact/members",
  "pg_multixact/offsets",
  "base",
  "base/1",
  "pg_replslot",
  "pg_tblspc",
  "pg_stat",
  "pg_stat_tmp",
  "pg_xact",
  "pg_logical",
  "pg_logical/snapshots",
  "pg_logical/mapping",
];

export const FILES = [
  "postgresql.conf",
  "postgresql.auto.conf",
  "pg_ident.conf",
  "pg_hba.conf",
];

export async function initDb(dataDir?: string) {
  var emscriptenOpts: Partial<EmPostgres> = {
    preRun: [
      (mod: any) => {
        mod.FS.mkdir(PGDATA, 0o750);
        if (dataDir) {
          const nodefs = mod.FS.filesystems.NODEFS;
          mod.FS.mount(nodefs, { root: dataDir }, PGDATA);
        }
        for (const dir of DIRS) {
          mod.FS.mkdir(PGDATA + "/" + dir, 0o700);
        }
        for (const filename of FILES) {
          mod.FS.writeFile(PGDATA + "/" + filename, "");
        }
        mod.FS.writeFile(PGDATA + "/PG_VERSION", "15devel");
        mod.FS.writeFile(PGDATA + "/base/1/PG_VERSION", "15devel");
      },
    ],
    locateFile: (base: string, _path: any) => {
      let path = "";
      if (base === "share.data") {
        path = PGSHARE_URL.toString();
      } else if (base === "postgres.wasm") {
        path = PGWASM_URL.toString();
      }
      if (path?.startsWith("file://")) {
        path = path.slice(7);
      }
      return path;
    },
    print: (text: string) => {
      // console.error(text);
    },
    printErr: (text: string) => {
      // console.error(text);
    },
    arguments: [
      "--boot",
      "-x1",
      "-X",
      "16777216",
      "-d",
      "5",
      "-c",
      "dynamic_shared_memory_type=mmap",
      "-D",
      PGDATA,
    ],
  };

  const { dirname, require } = await nodeValues();

  loadPgShare(emscriptenOpts, require);

  const mod = await EmPostgresFactory(emscriptenOpts, dirname, require);
  return mod;
}
