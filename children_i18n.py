#!/usr/bin/env python3
"""Multi-language i18n support for European languages."""

from typing import Dict, List, Optional

TRANSLATIONS = {
    "zh-CN": {
        "welcome": "欢迎使用欧洲儿童陪护机器人",
        "login_success": "登录成功",
        "login_failed": "登录失败",
        "register_success": "注册成功",
        "course_not_found": "课程未找到",
        "lesson_not_found": "课时未找到",
        "user_not_found": "用户未找到",
        "no_permission": "没有权限",
        "rate_limited": "请求过于频繁，请稍后再试",
        "internal_error": "服务器内部错误",
        "invalid_input": "输入参数无效",
        "token_expired": "令牌已过期",
        "token_invalid": "令牌无效",
        "operation_success": "操作成功",
        "operation_failed": "操作失败",
        "screen_time_exceeded": "屏幕使用时间已超限",
        "bedtime_restricted": "就寝时间已到，无法使用",
        "content_blocked": "内容已被家长屏蔽",
        "achievement_unlocked": "成就已解锁",
        "lesson_completed": "课时已完成",
        "report_weekly": "周报",
        "report_daily": "日报",
        "settings_saved": "设置已保存",
        "data_synced": "数据已同步",
        "device_offline": "设备已离线",
        "device_online": "设备已上线",
    },
    "en": {
        "welcome": "Welcome to European Children Companion Robot",
        "login_success": "Login successful",
        "login_failed": "Login failed",
        "register_success": "Registration successful",
        "course_not_found": "Course not found",
        "lesson_not_found": "Lesson not found",
        "user_not_found": "User not found",
        "no_permission": "No permission",
        "rate_limited": "Too many requests, please try again later",
        "internal_error": "Internal server error",
        "invalid_input": "Invalid input parameters",
        "token_expired": "Token expired",
        "token_invalid": "Invalid token",
        "operation_success": "Operation successful",
        "operation_failed": "Operation failed",
        "screen_time_exceeded": "Screen time limit exceeded",
        "bedtime_restricted": "Bedtime restriction active",
        "content_blocked": "Content blocked by parent",
        "achievement_unlocked": "Achievement unlocked",
        "lesson_completed": "Lesson completed",
        "report_weekly": "Weekly Report",
        "report_daily": "Daily Report",
        "settings_saved": "Settings saved",
        "data_synced": "Data synchronized",
        "device_offline": "Device offline",
        "device_online": "Device online",
    },
    "fr": {
        "welcome": "Bienvenue sur le Robot Compagnon pour Enfants Européen",
        "login_success": "Connexion réussie",
        "login_failed": "Échec de connexion",
        "register_success": "Inscription réussie",
        "course_not_found": "Cours non trouvé",
        "lesson_not_found": "Leçon non trouvée",
        "user_not_found": "Utilisateur non trouvé",
        "no_permission": "Permission refusée",
        "rate_limited": "Trop de requêtes, veuillez réessayer plus tard",
        "internal_error": "Erreur interne du serveur",
        "invalid_input": "Paramètres d'entrée invalides",
        "token_expired": "Jeton expiré",
        "token_invalid": "Jeton invalide",
        "operation_success": "Opération réussie",
        "operation_failed": "Échec de l'opération",
        "screen_time_exceeded": "Temps d'écran dépassé",
        "bedtime_restricted": "Restriction d'heure de coucher active",
        "content_blocked": "Contenu bloqué par le parent",
        "achievement_unlocked": "Succès débloqué",
        "lesson_completed": "Leçon terminée",
        "report_weekly": "Rapport Hebdomadaire",
        "report_daily": "Rapport Quotidien",
        "settings_saved": "Paramètres enregistrés",
        "data_synced": "Données synchronisées",
        "device_offline": "Appareil hors ligne",
        "device_online": "Appareil en ligne",
    },
    "de": {
        "welcome": "Willkommen beim Europäischen Kinderbegleitroboter",
        "login_success": "Anmeldung erfolgreich",
        "login_failed": "Anmeldung fehlgeschlagen",
        "register_success": "Registrierung erfolgreich",
        "course_not_found": "Kurs nicht gefunden",
        "lesson_not_found": "Lektion nicht gefunden",
        "user_not_found": "Benutzer nicht gefunden",
        "no_permission": "Keine Berechtigung",
        "rate_limited": "Zu viele Anfragen, bitte später erneut versuchen",
        "internal_error": "Interner Serverfehler",
        "invalid_input": "Ungültige Eingabeparameter",
        "token_expired": "Token abgelaufen",
        "token_invalid": "Ungültiges Token",
        "operation_success": "Vorgang erfolgreich",
        "operation_failed": "Vorgang fehlgeschlagen",
        "screen_time_exceeded": "Bildschirmzeit überschritten",
        "bedtime_restricted": "Schlafenszeit-Beschränkung aktiv",
        "content_blocked": "Inhalt von Eltern blockiert",
        "achievement_unlocked": "Erfolg freigeschaltet",
        "lesson_completed": "Lektion abgeschlossen",
        "report_weekly": "Wochenbericht",
        "report_daily": "Tagesbericht",
        "settings_saved": "Einstellungen gespeichert",
        "data_synced": "Daten synchronisiert",
        "device_offline": "Gerät offline",
        "device_online": "Gerät online",
    },
    "es": {
        "welcome": "Bienvenido al Robot Acompañante Infantil Europeo",
        "login_success": "Inicio de sesión exitoso",
        "login_failed": "Inicio de sesión fallido",
        "register_success": "Registro exitoso",
        "course_not_found": "Curso no encontrado",
        "lesson_not_found": "Lección no encontrada",
        "user_not_found": "Usuario no encontrado",
        "no_permission": "Sin permiso",
        "rate_limited": "Demasiadas solicitudes, intente más tarde",
        "internal_error": "Error interno del servidor",
        "invalid_input": "Parámetros de entrada inválidos",
        "token_expired": "Token expirado",
        "token_invalid": "Token inválido",
        "operation_success": "Operación exitosa",
        "operation_failed": "Operación fallida",
        "screen_time_exceeded": "Tiempo de pantalla excedido",
        "bedtime_restricted": "Restricción de hora de dormir activa",
        "content_blocked": "Contenido bloqueado por los padres",
        "achievement_unlocked": "Logro desbloqueado",
        "lesson_completed": "Lección completada",
        "report_weekly": "Informe Semanal",
        "report_daily": "Informe Diario",
        "settings_saved": "Configuración guardada",
        "data_synced": "Datos sincronizados",
        "device_offline": "Dispositivo desconectado",
        "device_online": "Dispositivo conectado",
    },
    "it": {
        "welcome": "Benvenuto al Robot Compagno per Bambini Europeo",
        "login_success": "Accesso riuscito",
        "login_failed": "Accesso fallito",
        "register_success": "Registrazione riuscita",
        "course_not_found": "Corso non trovato",
        "lesson_not_found": "Lezione non trovata",
        "user_not_found": "Utente non trovato",
        "no_permission": "Nessun permesso",
        "rate_limited": "Troppe richieste, riprova più tardi",
        "internal_error": "Errore interno del server",
        "invalid_input": "Parametri di input non validi",
        "token_expired": "Token scaduto",
        "token_invalid": "Token non valido",
        "operation_success": "Operazione riuscita",
        "operation_failed": "Operazione fallita",
        "screen_time_exceeded": "Tempo di schermo superato",
        "bedtime_restricted": "Restrizione orario di sonno attiva",
        "content_blocked": "Contenuto bloccato dai genitori",
        "achievement_unlocked": "Obiettivo sbloccato",
        "lesson_completed": "Lezione completata",
        "report_weekly": "Rapporto Settimanale",
        "report_daily": "Rapporto Giornaliero",
        "settings_saved": "Impostazioni salvate",
        "data_synced": "Dati sincronizzati",
        "device_offline": "Dispositivo offline",
        "device_online": "Dispositivo online",
    },
}

SUPPORTED_LOCALES = list(TRANSLATIONS.keys())

class I18n:
    def __init__(self, default_locale: str = "zh-CN"):
        self._default = default_locale
        self._user_locales: Dict[str, str] = {}

    def set_user_locale(self, user_id: str, locale: str):
        if locale in TRANSLATIONS:
            self._user_locales[user_id] = locale

    def get_user_locale(self, user_id: str) -> str:
        return self._user_locales.get(user_id, self._default)

    def t(self, key: str, locale: str = None, **kwargs) -> str:
        lang = locale or self._default
        translations = TRANSLATIONS.get(lang, TRANSLATIONS[self._default])
        text = translations.get(key, key)
        if kwargs:
            text = text.format(**kwargs)
        return text

    def translate_response(self, data: dict, key: str, user_id: str = None,
                           locale: str = None) -> dict:
        lang = locale or self._user_locales.get(user_id, self._default)
        data["message"] = self.t(key, lang)
        return data

    def get_supported_locales(self) -> List[Dict]:
        return [
            {"code": code, "name": {
                "zh-CN": "中文", "en": "English", "fr": "Français",
                "de": "Deutsch", "es": "Español", "it": "Italiano",
            }.get(code, code)}
            for code in SUPPORTED_LOCALES
        ]

i18n = I18n()
