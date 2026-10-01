from django.urls import path
from .views import upload_resume, resume_list, delete_resume, resume_detail

urlpatterns = [
    path("upload/", upload_resume, name="upload_resume"),
    path("list/", resume_list, name="resume_list"),
    path("delete/<int:resume_id>/",delete_resume,name="delete_resume"),
    path("<int:resume_id>/",resume_detail,name="resume_detail"),
]