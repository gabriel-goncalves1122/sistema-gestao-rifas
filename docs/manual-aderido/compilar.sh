#!/bin/bash

# Script de compilação do Manual do Aderido
echo "🚀 Iniciando compilação do LaTeX..."

# Compilar duas vezes para garantir que links e referências sejam gerados corretamente
pdflatex -interaction=nonstopmode manual.tex
pdflatex -interaction=nonstopmode manual.tex

echo "✅ Compilação finalizada!"
echo "📄 O arquivo manual.pdf foi gerado com sucesso."
