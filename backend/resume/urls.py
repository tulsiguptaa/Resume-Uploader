from django.urls import path
from .views import upload_resume,evaluate_interview_answer,get_interview_report, save_interview_answer, get_resume_sessions,resume_list, delete_resume, resume_detail, generate_questions_api, get_session_questions

urlpatterns = [
    path("upload/", upload_resume, name="upload_resume"),
    path("list/", resume_list, name="resume_list"),
    path("delete/<int:resume_id>/",delete_resume,name="delete_resume"),
    path("<int:resume_id>/",resume_detail,name="resume_detail"),
    path("<int:resume_id>/generate-questions/",generate_questions_api),
    path( "session/<int:session_id>/questions/",get_session_questions),
    path("<int:resume_id>/sessions/",get_resume_sessions),
    path("question/<int:question_id>/answer/",save_interview_answer),
    path("question/<int:question_id>/evaluate/",evaluate_interview_answer),
    path("session/<int:session_id>/report/",get_interview_report),
]