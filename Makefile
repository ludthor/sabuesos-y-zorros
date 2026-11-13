# Regenera el kit imprimible a partir de cartas/cartas.csv
.PHONY: pdf
pdf:
	python3 herramientas/generar_cartas.py cartas/cartas.csv imprimir
