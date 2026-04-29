#!/usr/bin/env python
import argparse
import glob
import os
import re
from pathlib import Path

import pandas as pd


def limpiar_nombre(nombre):
    """Limpia el nombre eliminando saltos de linea y posibles codigos largos."""
    if nombre is None:
        return None

    texto = str(nombre).replace("\n", " ").replace("\r", " ").strip()
    if not texto or texto.lower() == "nan":
        return None

    # Remueve codigos numericos largos comunes en placas/activos.
    texto = re.sub(r"\s+921\d{6,}", "", texto)
    texto = re.sub(r"\s+011\d{5,}", "", texto)
    texto = re.sub(r"\s+\d{6,}", "", texto)
    texto = re.sub(r"\s+", " ", texto).strip()

    return texto if len(texto) > 2 else None


def extraer_nombre_equipo(df):
    """Intenta extraer el nombre del equipo con varias estrategias."""

    # Metodo 1: Buscar fila con "NOMBRE DEL EQUIPO".
    for _, fila in df.iterrows():
        fila_str = fila.astype(str).str.upper()
        if fila_str.str.contains("NOMBRE DEL EQUIPO", na=False).any():
            if len(fila) > 7 and pd.notna(fila.iloc[7]):
                nombre = limpiar_nombre(fila.iloc[7])
                if nombre:
                    return nombre

            for col in range(len(fila)):
                valor = fila.iloc[col]
                if pd.notna(valor) and len(str(valor)) > 5:
                    if "NOMBRE DEL EQUIPO" not in str(valor).upper():
                        nombre = limpiar_nombre(valor)
                        if nombre and len(nombre) > 3:
                            return nombre

    # Metodo 2: Posicion fija frecuente (fila 10, col H).
    if len(df) > 10 and len(df.columns) > 7:
        nombre = limpiar_nombre(df.iloc[10, 7] if pd.notna(df.iloc[10, 7]) else None)
        if nombre:
            return nombre

    # Metodo 3: Posicion fija alternativa (fila 9, col H).
    if len(df) > 9 and len(df.columns) > 7:
        nombre = limpiar_nombre(df.iloc[9, 7] if pd.notna(df.iloc[9, 7]) else None)
        if nombre:
            return nombre

    return None


def normalizar_clave(texto):
    return re.sub(r"\s+", " ", str(texto).strip().lower())


def buscar_excels(ruta_principal):
    patrones = ["**/*.xlsx", "**/*.xls"]
    archivos = []
    for patron in patrones:
        archivos.extend(glob.glob(os.path.join(ruta_principal, patron), recursive=True))

    # Ignorar temporales de Excel (~$archivo.xlsx).
    archivos = [a for a in archivos if not Path(a).name.startswith("~$")]
    return sorted(set(archivos))


def main():
    parser = argparse.ArgumentParser(
        description="Extrae equipos desde multiples Excel y genera CSV compatible con SIGIRL"
    )
    parser.add_argument("--ruta", required=True, help="Carpeta raiz con los archivos Excel")
    parser.add_argument(
        "--categoria",
        default="Equipos de Laboratorio",
        help="Categoria a usar en el CSV importable",
    )
    parser.add_argument(
        "--out-dir",
        default=".",
        help="Carpeta de salida para los CSV generados",
    )
    args = parser.parse_args()

    ruta_principal = os.path.abspath(args.ruta)
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not os.path.isdir(ruta_principal):
        raise SystemExit(f"Ruta invalida o inexistente: {ruta_principal}")

    archivos_excel = buscar_excels(ruta_principal)

    print(f"Buscando en: {ruta_principal}")
    print(f"Archivos Excel encontrados: {len(archivos_excel)}")
    print("Los PDF, DOCX e instructivos se ignoran automaticamente.\n")

    equipos_detalle = []
    errores = []

    for idx, archivo in enumerate(archivos_excel, 1):
        try:
            df = pd.read_excel(archivo, header=None)
            nombre_equipo = extraer_nombre_equipo(df)

            if nombre_equipo:
                equipos_detalle.append(
                    {
                        "archivo": os.path.basename(archivo),
                        "carpeta": os.path.basename(os.path.dirname(archivo)),
                        "nombre_equipo": nombre_equipo,
                    }
                )
                print(f"OK [{idx}/{len(archivos_excel)}] {nombre_equipo[:60]}")
            else:
                print(f"WARN [{idx}/{len(archivos_excel)}] Sin equipo: {os.path.basename(archivo)}")
                errores.append((archivo, "sin_nombre"))

        except Exception as exc:
            print(f"ERROR [{idx}/{len(archivos_excel)}] {os.path.basename(archivo)} -> {str(exc)[:90]}")
            errores.append((archivo, str(exc)))

    if not equipos_detalle:
        print("\nNo se encontraron equipos. Verifica ruta y formato de los Excel.")
        return

    # Guardar detalle completo.
    detalle_path = out_dir / "listado_completo_equipos.csv"
    pd.DataFrame(equipos_detalle).to_csv(detalle_path, index=False, encoding="utf-8-sig")

    # Armar salida importable a SIGIRL, deduplicada por nombre.
    unicos = {}
    for fila in equipos_detalle:
        nombre = fila["nombre_equipo"]
        clave = normalizar_clave(nombre)
        if clave not in unicos:
            unicos[clave] = nombre

    filas_sigirl = [
        {
            "nombre": nombre,
            "tipo": "equipo",
            "categoria": args.categoria,
            "cantidad": 1,
            "minimo": 1,
            "ubicacion": "",
            "fecha_vencimiento": "",
        }
        for nombre in sorted(unicos.values())
    ]

    sigirl_path = out_dir / "equipos_para_sigirl.csv"
    pd.DataFrame(filas_sigirl).to_csv(sigirl_path, index=False, encoding="utf-8-sig")

    print("\n" + "=" * 72)
    print("RESUMEN FINAL")
    print(f"- Equipos detectados (con repetidos): {len(equipos_detalle)}")
    print(f"- Equipos unicos: {len(filas_sigirl)}")
    print(f"- Archivos con problema: {len(errores)}")
    print(f"- CSV detalle: {detalle_path}")
    print(f"- CSV importable SIGIRL: {sigirl_path}")
    print("=" * 72)

    if errores:
        errores_path = out_dir / "errores_lectura_equipos.csv"
        pd.DataFrame(errores, columns=["archivo", "error"]).to_csv(
            errores_path, index=False, encoding="utf-8-sig"
        )
        print(f"- Log de errores: {errores_path}")


if __name__ == "__main__":
    main()
