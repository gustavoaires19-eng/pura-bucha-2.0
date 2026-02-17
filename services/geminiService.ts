
import { GoogleGenAI } from "@google/genai";
import { DredgePoint } from "../types";

// Initialize the Gemini API client using the environment variable directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDredgingData = async (points: DredgePoint[]) => {
  // Map points including notes for richer context for the AI
  const dataSummary = points.map(p => ({
    material: p.material,
    depth: p.depth,
    volume: p.volume,
    vessel: p.vesselName,
    notes: p.notes
  }));

  const prompt = `Atue como um Engenheiro Consultor Sênior especializado em Dragagem Portuária e Hidrografia. Analise os seguintes dados operacionais coletados em campo:
  ${JSON.stringify(dataSummary)}
  
  Sua tarefa é gerar um Relatório Técnico de Otimização Operacional em Markdown (Português Brasileiro). Foque nos seguintes pontos:

  1. **Análise de Desempenho por Material:** Como a geologia local (Areia, Argila, Silte, Rocha) está afetando a produtividade. Identifique se o volume extraído está condizente com a dificuldade esperada para cada tipo de solo.
  2. **Mapeamento de Gargalos de Profundidade:** Identifique áreas onde a profundidade está abaixo da cota de projeto ou onde variações abruptas estão causando ineficiência operacional (ex: necessidade de múltiplas passadas).
  3. **Soluções Técnicas Propostas:** Para cada gargalo identificado, sugira soluções de engenharia específicas, como:
     - Ajustes finos na pressão de sucção ou velocidade de avanço da draga.
     - Mudança na estratégia de corte (ângulos, padrões de sobreposição).
     - Gerenciamento de janelas de maré para otimização de calado e sucção.
     - Sugestões de troca de equipamentos (ex: uso de cabeças de corte mais agressivas para áreas de argila densa).
  4. **Diretrizes para as Próximas 48 Horas:** Priorize as ações mais urgentes para garantir a segurança da navegação e o cumprimento das metas de volume.

  Seja técnico, preciso e utilize terminologia padrão da indústria de dragagem.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.3, // Lower temperature for more consistent technical and analytical output
        topP: 0.95,
      }
    });
    // Correctly accessing the text property from GenerateContentResponse.
    return response.text;
  } catch (error) {
    console.error("Erro ao analisar dados com Gemini:", error);
    return "### Erro na Análise Técnica\n\nNão foi possível processar os dados de dragagem no momento. Por favor, verifique se há dados registrados e tente novamente.";
  }
};
