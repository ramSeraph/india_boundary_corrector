# -*- coding: utf-8 -*-
"""
Layer configurations for tile URL matching and styling.

This mirrors the JavaScript layer-configs package.
"""

import re
import json
import os

# Load configs from JSON
_config_path = os.path.join(os.path.dirname(__file__), 'configs.json')
with open(_config_path, 'r') as f:
    LAYER_CONFIGS = json.load(f)


def _template_to_regex(template):
    """Convert a tile URL template to a regex pattern.
    
    Supports placeholders:
    - {z}, {x}, {y} - tile coordinates
    - {s} - subdomain (a, b, c, etc.)
    - {a-c} - OpenLayers style subdomain range
    - {1-4} - numeric subdomain range
    - {r} - retina suffix (@2x, etc.)
    """
    # Escape regex special characters except { }
    pattern = re.escape(template)
    
    # Replace escaped placeholders with regex patterns
    pattern = pattern.replace(r'\{z\}', r'(?P<z>\d+)')
    pattern = pattern.replace(r'\{x\}', r'(?P<x>\d+)')
    pattern = pattern.replace(r'\{y\}', r'(?P<y>\d+)')
    pattern = pattern.replace(r'\{s\}', r'[a-z]')
    pattern = pattern.replace(r'\{r\}', r'(?:@\d+(?:\.\d+)?x)?')
    
    # Handle OpenLayers style {a-c} subdomain ranges
    pattern = re.sub(r'\\{([a-z])-([a-z])\\}', lambda m: f'[{m.group(1)}-{m.group(2)}]', pattern)
    
    # Handle numeric subdomain ranges {1-4}
    pattern = re.sub(r'\\{(\d)-(\d)\\}', lambda m: f'[{m.group(1)}-{m.group(2)}]', pattern)
    
    # Allow http or https
    pattern = pattern.replace(r'https\:', r'https?:')
    
    # Allow query parameters
    pattern = pattern + r'(?:\?.*)?'
    
    return re.compile('^' + pattern + '$', re.IGNORECASE)


def _compile_config_patterns(config):
    """Pre-compile regex patterns for a config."""
    if '_compiled_patterns' not in config:
        templates = config.get('tileUrlTemplates', [])
        config['_compiled_patterns'] = [_template_to_regex(t) for t in templates]
    return config['_compiled_patterns']


def match_url(url):
    """Find a layer config that matches the given URL.
    
    :param url: Tile URL to match
    :returns: Matching config dict or None
    """
    for config in LAYER_CONFIGS:
        patterns = _compile_config_patterns(config)
        for pattern in patterns:
            if pattern.match(url):
                return config
    return None


def extract_coords(url, config):
    """Extract tile coordinates from a URL using the config's templates.
    
    :param url: Tile URL
    :param config: Layer config dict
    :returns: Dict with z, x, y keys or None
    """
    patterns = _compile_config_patterns(config)
    for pattern in patterns:
        match = pattern.match(url)
        if match:
            groups = match.groupdict()
            if 'z' in groups and 'x' in groups and 'y' in groups:
                return {
                    'z': int(groups['z']),
                    'x': int(groups['x']),
                    'y': int(groups['y'])
                }
    return None


def get_line_styles_for_zoom(config, z):
    """Get line styles active at a given zoom level.
    
    :param config: Layer config dict
    :param z: Zoom level
    :returns: List of active line style dicts
    """
    start_zoom = config.get('startZoom', 0)
    styles = config.get('lineStyles', [])
    
    active = []
    for style in styles:
        style_start = style.get('startZoom', start_zoom)
        style_end = style.get('endZoom', float('inf'))
        if style_start <= z <= style_end:
            active.append(style)
    
    return active


def get_line_width(z, line_width_stops):
    """Interpolate line width from stops.
    
    :param z: Zoom level
    :param line_width_stops: Dict of zoom -> width
    :returns: Interpolated line width
    """
    stops = sorted([(int(k), v) for k, v in line_width_stops.items()])
    
    if not stops:
        return 1.0
    
    if z <= stops[0][0]:
        return stops[0][1]
    if z >= stops[-1][0]:
        return stops[-1][1]
    
    # Find surrounding stops and interpolate
    for i in range(len(stops) - 1):
        z1, w1 = stops[i]
        z2, w2 = stops[i + 1]
        if z1 <= z <= z2:
            t = (z - z1) / (z2 - z1)
            return w1 + t * (w2 - w1)
    
    return stops[-1][1]
