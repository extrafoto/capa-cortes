# Globo Crop

Ferramenta estática para preparar fotografias JPG localmente. Nenhuma imagem sai do navegador.

## Uso local

Requer Node.js 20.19+ (ou 22.12+).

```bash
npm install
npm run dev
```

Para validar a versão de produção: `npm run build` e `npm run preview`.

## Presets

Edite somente `src/config/crop-presets.js`. Apenas **Capa principal (2620 × 1200)** está marcada como confirmada; os demais são provisórios.

## Metadados

Ao exportar, a aplicação reinjeta blocos JPEG IPTC (APP13/Photoshop) e XMP (APP1), quando existentes, e valida a sua presença. O EXIF técnico é intencionalmente descartado: preservá-lo sem reescrever com segurança dimensões, orientação e miniatura poderia tornar o arquivo inconsistente com os pixels recortados. Logo, não há promessa de preservação integral de metadados. Para fluxos que exigem EXIF completo, use um processamento local complementar com ExifTool para reescrever os campos técnicos e validar o resultado.

## Testes manuais

1. Carregue JPGs horizontal, vertical e com orientação EXIF.
2. Alterne os formatos, arraste a área ativa e use zoom.
3. Baixe cada formato e confirme as dimensões em um visualizador de imagens.
4. Compare XMP/IPTC do original e exportado com ExifTool; confira que legenda e crédito foram retidos quando presentes.

## Netlify

O projeto já define `npm run build` e diretório `dist` em `netlify.toml`.
