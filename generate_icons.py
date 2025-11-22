#!/usr/bin/env python3
"""
Script para generar iconos PWA del Geoportal Buenaventura
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Tamaños de iconos necesarios
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

# Colores del geoportal (verde y amarillo)
color1 = (134, 239, 172)  # #86efac
color2 = (254, 240, 138)  # #fef08a

def create_gradient(width, height):
    """Crea un gradiente diagonal de verde a amarillo"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    for y in range(height):
        for x in range(width):
            # Calcular posición diagonal (0 a 1)
            pos = (x + y) / (width + height)
            
            # Interpolar entre los dos colores
            r = int(color1[0] + (color2[0] - color1[0]) * pos)
            g = int(color1[1] + (color2[1] - color1[1]) * pos)
            b = int(color1[2] + (color2[2] - color1[2]) * pos)
            
            draw.point((x, y), fill=(r, g, b))
    
    return img

def add_map_icon(img):
    """Agrega un icono de mapa al centro"""
    draw = ImageDraw.Draw(img)
    width, height = img.size
    
    # Color oscuro para el icono
    dark_color = (30, 41, 59)  # #1e293b
    
    # Calcular tamaño del icono (60% del tamaño total)
    icon_size = int(min(width, height) * 0.6)
    margin = (width - icon_size) // 2
    
    # Dibujar un pin de ubicación simplificado
    center_x = width // 2
    center_y = height // 2
    
    # Círculo superior del pin
    circle_radius = icon_size // 3
    circle_top = center_y - icon_size // 6
    draw.ellipse(
        [center_x - circle_radius, circle_top - circle_radius,
         center_x + circle_radius, circle_top + circle_radius],
        fill=dark_color
    )
    
    # Triángulo inferior del pin
    triangle_points = [
        (center_x, center_y + icon_size // 3),  # punta inferior
        (center_x - circle_radius // 2, circle_top + circle_radius // 2),  # izquierda
        (center_x + circle_radius // 2, circle_top + circle_radius // 2)   # derecha
    ]
    draw.polygon(triangle_points, fill=dark_color)
    
    # Círculo blanco en el centro del pin
    inner_circle_radius = circle_radius // 2.5
    draw.ellipse(
        [center_x - inner_circle_radius, circle_top - inner_circle_radius,
         center_x + inner_circle_radius, circle_top + inner_circle_radius],
        fill=(255, 255, 255)
    )
    
    return img

def create_icon(size):
    """Crea un icono de un tamaño específico"""
    print(f"Creando icono de {size}x{size}...")
    
    # Crear imagen con gradiente
    img = create_gradient(size, size)
    
    # Agregar icono de mapa
    img = add_map_icon(img)
    
    # Guardar imagen
    filename = f"icon-{size}x{size}.png"
    img.save(filename, 'PNG')
    print(f"✅ Guardado: {filename}")

def main():
    print("🎨 Generando iconos PWA para Geoportal Buenaventura...")
    print("=" * 60)
    
    for size in sizes:
        create_icon(size)
    
    print("=" * 60)
    print(f"✅ Se generaron {len(sizes)} iconos correctamente!")
    print("\nIconos creados:")
    for size in sizes:
        print(f"  • icon-{size}x{size}.png")

if __name__ == "__main__":
    main()
