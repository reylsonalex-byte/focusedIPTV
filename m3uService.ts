import axios from 'axios';
import parser from 'iptv-playlist-parser';

export const parseM3ULink = async (url: string) => {
  try {
    const response = await axios.get(url, { timeout: 15000 }); // Timeout maior para listas pesadas
    const playlist = parser.parse(response.data);
    
    // O parser vai te entregar um objeto com:
    // playlist.items -> Array com todos os canais/filmes
    return playlist.items;
  } catch (error) {
    console.error("Erro ao processar M3U:", error);
    return null;
  }
};