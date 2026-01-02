# -*- coding: utf-8 -*-
"""
India Boundary Corrector QGIS Plugin

Corrects India's boundaries on XYZ raster tile layers.
"""


def classFactory(iface):
    """Load the plugin class.
    
    :param iface: A QGIS interface instance.
    :type iface: QgsInterface
    """
    from .plugin import IndiaBoundaryCorrectorPlugin
    return IndiaBoundaryCorrectorPlugin(iface)
