"""
URL configuration for fmt_project project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers

urlpatterns = [
    path('api/', include('core.urls')),
]
