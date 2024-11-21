// Importa e configura o arquivo de Variáveis de Ambiente
import "dotenv/config";

// Importa as dependências.
import moment from "moment";
import { execSync } from "child_process";
import { Client } from "basic-ftp";
import { existsSync, unlink } from "fs";

// Define a data e a hora da execução (!!!Importante para localizar o arquivo de backup).
const date = moment().format("YYYY_M_D_hh_mm");

// Define o nome do arquivo de backup de acordo com a data.
const file = `wanguard_db_backup_${date}.sql`;

// Executa o comando bash (de forma sincrona, para que a função de enviar para o ftp não execute antes) para gerar o arquivo de backup.
console.log(`[ ${moment().format("D/M/YYYY | H:mm")} ] Gerando arquivo de backup...`);
execSync(
  "/opt/andrisoft/bin/WANmaintenance backup_db",
  (error, stdout, stderr) => {
    // Checa se houve algum erro no comando e informa via log.
    if (error) console.log(error.message);
    if (stderr) console.log(stderr);
  }
);

// Verifica se o arquivo de backup foi criado, caso não, informa o erro via log e retorna a função.
if (existsSync(file)) {
  console.log(`[ ${moment().format("D/M/YYYY | H:mm")} ] Iniciando upload...`);
  // Chama a função para upar os arquivos via ftp.
  saveBackup();
} else {
  console.log(`[ ${moment().format("D/M/YYYY | H:mm")} ] (ERRO) Arquivo não encontrado`);
}

// Define a função para upar os arquivos via ftp.
async function saveBackup() {
  // Define um novo cliente ftp
  const client = new Client();
  // Silencia o log do ftp
  client.ftp.verbose = false;
  try {
    // Realiza o acesso ftp.
    await client.access({
      host: process.env.FTP_SERVER,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
    });
    // Faz o upload do arquivo.
    await client.uploadFrom(file, `${process.env.FTP_DIR}/${process.env.FTP_FILE_PREFIX}${file}`);

    // Deleta o arquivo temporário local e informa caso falhe ao deletar
    unlink(file, (err) => {
      if (err) console.log(err);
    });
  } catch (err) {
    // Retorna um erro caso algo no cliente ftp falhe.
    console.log(err);
  }
  client.close();
  console.log(`[ ${moment().format("D/M/YYYY | H:mm")} ] Upload concluído com sucesso!`)
}
