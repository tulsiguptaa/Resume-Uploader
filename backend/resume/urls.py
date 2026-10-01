from django.urls import path
from .views import upload_resume, resume_list

urlpatterns = [
    path("upload/", upload_resume, name="upload_resume"),
    path("list/", resume_list, name="resume_list"),
    
]