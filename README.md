# Constructor de bandas de Trench Crusade

Herramienta en castellano para montar bandas de *Trench Crusade*: elige facción o variante, recluta miniaturas, equípalas y comprueba el coste y la legalidad de la banda según las reglas de *Warbands of Trench Crusade* 1.0.2.

**Abrir el constructor:** https://cesarsala92.github.io/trench-crusade-constructor/

## Qué hace

- Recluta unidades con su perfil, palabras clave y habilidades.
- Equipa cada miniatura desde la armería de su facción, con el coste visible y la explicación de por qué un objeto no se puede llevar.
- Calcula el coste de cada modelo y de la banda frente al presupuesto (ducados y gloria).
- Revisa la banda: líder obligatorio, máximos de unidades, límites de equipo, manos, escudos, armas pesadas y reglas propias de cada variante.
- Pulsa una palabra clave para ver qué hace.
- Exporta la banda como texto.
- Guarda tus bandas en el navegador (en GitHub Pages) o en tu cuenta (dentro de Claude).

## Facciones incluidas

| Facción | Variantes |
|---|---|
| Culto del Grial Negro | Canto Fúnebre del Gran Hegemón |
| Principado de Nueva Antioquía | Estados Pontificios · Rangers de Éire · Reino de Alba · Stosstruppen de Prusia · Abisinia |

## Cómo está organizado

El programa y las reglas están separados, para que actualizar reglas no obligue a tocar código.

```
index.html          página y estilos
motor.js            cálculo de costes y validación (no contiene reglas de ninguna facción)
app.js              pantalla, guardado y exportación
datos/
  version.json      versión del reglamento y registro de cambios
  comun.json        armería común y lista de palabras clave
  es.json           todos los textos en castellano
  mercenarios.json  mercenarios y quién puede contratarlos
  faccion/*.json    una facción por archivo
  variante/*.json   cada variante, como cambios sobre su facción base
```

### Editar reglas

- **Coste, límite o restricción de un objeto:** su línea en `armeria` del archivo de la facción. Ejemplo:
  `{"obj": "putrid-shotgun", "d": 20, "lim": 2, "estip": ["BAYONET_LUG", "SHIELD_COMBO"]}` → 20 ducados, máximo 2 en la banda, admite bayoneta y escudo.
- **Atributos o máximo de una unidad:** su entrada en `unidades`.
- **Algo que solo cambia en una variante:** el archivo de la variante (`cambios`, `mas`, `menos`, `unidades`…).
- **Nombres y textos:** `datos/es.json`.
- **Facción o variante nueva:** un archivo en `datos/faccion/` o `datos/variante/` y su identificador en `datos/version.json`.

Los identificadores y las palabras clave se guardan en inglés, tal como aparecen en el libro, y se traducen al mostrarlos. Así es fácil comparar con nuevas versiones del reglamento.

## Aviso

Proyecto de aficionados sin relación oficial con Trench Crusade ni con sus autores. *Trench Crusade* y sus nombres son propiedad de sus creadores; las reglas oficiales se descargan gratis en [trenchcrusade.com](https://www.trenchcrusade.com/). Los textos de este repositorio son resúmenes y traducciones propias para facilitar el juego.
