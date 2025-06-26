const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

function gerarDados() {
  return [
    { titulo: 'Status de Máquinas', mensagem: 'Máquina de corte #3', status: 'Erro' },
    { titulo: 'Setor de Produção', mensagem: 'Funcionamento dentro dos padrões.', status: 'OK' },
    { titulo: 'Funcionários', mensagem: 'Operador João ausente da estação.', status: 'Alerta' },
    { titulo: 'Logística', mensagem: `Caminhão 1 saiu da rota às ${new Date().toLocaleTimeString()}`, status: 'Alerta' },
  ];
}

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  const enviarAtualizacoes = () => {
    const dados = gerarDados();
    ws.send(JSON.stringify(dados));
  };

  enviarAtualizacoes(); // envia logo que conecta

  const intervalo = setInterval(enviarAtualizacoes, 10000); // envia a cada 10s

  ws.on('close', () => {
    clearInterval(intervalo);
    console.log('Cliente desconectado');
  });
});

server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
  
});


const API_KEY = '5b3ce3597851110001cf62483a49c2b800544824b99272cbd476a332';

async function geocodificarEndereco(endereco) {
  const response = await axios.get('https://api.openrouteservice.org/geocode/search', {
    params: {
      api_key: API_KEY,
      text: endereco
    }
  });

  const coords = response.data.features[0].geometry.coordinates; // [lon, lat]
  return coords;
}

app.get('/api/rota', async (req, res) => {
  const origemEndereco = req.query.origem || 'São Paulo, SP';
  const destinoEndereco = req.query.destino || 'Campinas, SP';

  try {
    const origemCoords = await geocodificarEndereco(origemEndereco);
    const destinoCoords = await geocodificarEndereco(destinoEndereco);

    const response = await axios.get('https://api.openrouteservice.org/v2/directions/driving-car', {
      params: {
        start: origemCoords.join(','),
        end: destinoCoords.join(',')
      },
      headers: {
        Authorization: API_KEY
      }
    });

    const rota = response.data.features[0].properties.segments[0];

    res.json({
      origem: origemEndereco,
      destino: destinoEndereco,
      duracao: `${Math.round(rota.duration / 60)} min`,
      distancia: `${(rota.distance / 1000).toFixed(1)} km`
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ erro: 'Erro ao buscar rota' });
  }
});
