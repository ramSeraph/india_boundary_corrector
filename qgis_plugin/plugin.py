# -*- coding: utf-8 -*-
"""
Main plugin module for India Boundary Corrector.
"""

from qgis.PyQt.QtCore import QObject
from qgis.PyQt.QtWidgets import QAction, QMessageBox
from qgis.PyQt.QtGui import QIcon

from .tile_interceptor import TileInterceptor

import os


class IndiaBoundaryCorrectorPlugin(QObject):
    """Main QGIS plugin class."""

    def __init__(self, iface):
        """Initialize the plugin.
        
        :param iface: QGIS interface instance
        :type iface: QgsInterface
        """
        super().__init__()
        self.iface = iface
        self.plugin_dir = os.path.dirname(__file__)
        self.action = None
        self.interceptor = None
        self.enabled = False

    def initGui(self):
        """Initialize the plugin GUI - called when plugin is loaded."""
        icon_path = os.path.join(self.plugin_dir, 'icon.png')
        icon = QIcon(icon_path) if os.path.exists(icon_path) else QIcon()
        
        self.action = QAction(icon, 'India Boundary Corrector', self.iface.mainWindow())
        self.action.setCheckable(True)
        self.action.setChecked(False)
        self.action.triggered.connect(self.toggle_correction)
        self.action.setToolTip('Enable/disable India boundary corrections on XYZ tile layers')
        
        # Add to plugins menu and toolbar
        self.iface.addToolBarIcon(self.action)
        self.iface.addPluginToRasterMenu('&India Boundary Corrector', self.action)

    def unload(self):
        """Unload the plugin - called when plugin is unloaded."""
        self.disable_correction()
        
        self.iface.removeToolBarIcon(self.action)
        self.iface.removePluginRasterMenu('&India Boundary Corrector', self.action)

    def toggle_correction(self, checked):
        """Toggle boundary correction on/off."""
        if checked:
            self.enable_correction()
        else:
            self.disable_correction()

    def enable_correction(self):
        """Enable tile interception and correction."""
        try:
            if self.interceptor is None:
                self.interceptor = TileInterceptor(self.plugin_dir)
            
            self.interceptor.enable()
            self.enabled = True
            
            port = self.interceptor.port
            self.iface.messageBar().pushSuccess(
                'India Boundary Corrector',
                f'Proxy server started on port {port}. Use proxy URLs for XYZ layers.'
            )
            
            # Show usage instructions
            self._show_usage_dialog()
            
        except Exception as e:
            self.action.setChecked(False)
            QMessageBox.critical(
                self.iface.mainWindow(),
                'India Boundary Corrector',
                f'Failed to start proxy server:\n{e}'
            )

    def disable_correction(self):
        """Disable tile interception and correction."""
        if self.interceptor is not None:
            self.interceptor.disable()
        
        self.enabled = False
        self.iface.messageBar().pushInfo('India Boundary Corrector', 'Boundary correction disabled')

    def _show_usage_dialog(self):
        """Show dialog with usage instructions."""
        if self.interceptor is None:
            return
        
        port = self.interceptor.port
        
        example_osm = f'http://127.0.0.1:{port}/proxy/https%3A%2F%2Ftile.openstreetmap.org%2F{{z}}%2F{{x}}%2F{{y}}.png'
        
        msg = f'''India Boundary Corrector is now active!

To use corrected tiles, add an XYZ layer with a proxy URL:

Proxy URL format:
http://127.0.0.1:{port}/proxy/{{encoded_original_url}}

Example for OpenStreetMap:
{example_osm}

The proxy will automatically detect supported tile providers and apply corrections.

Supported providers:
- OpenStreetMap Standard
- CartoDB Dark/Light
- CartoDB Voyager
- OpenTopoMap
'''
        
        QMessageBox.information(
            self.iface.mainWindow(),
            'India Boundary Corrector - Usage',
            msg
        )
