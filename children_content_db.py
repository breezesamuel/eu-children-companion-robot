#!/usr/bin/env python3
"""
统一内容数据库 - 育儿园 / 小学 / 中学 三阶段分级内容系统
"""
from typing import Dict, List, Optional
import logging
logger = logging.getLogger("content_db")

# ==================== 年级/阶段定义 ====================
STAGES = {
    "kindergarten": {
        "name": "育儿园", "name_en": "Kindergarten", "age_range": "3-6",
        "sub_stages": [
            {"id": "k1", "name": "小班", "age": "3-4", "description": "基础认知培养"},
            {"id": "k2", "name": "中班", "age": "4-5", "description": "综合能力发展"},
            {"id": "k3", "name": "大班", "age": "5-6", "description": "入学准备阶段"},
        ],
        "subjects": ["语言发展", "数学启蒙", "科学探索", "艺术创造", "音乐律动", "健康体育", "社会认知"],
        "learning_hours_per_week": 10,
    },
    "primary": {
        "name": "小学", "name_en": "Primary School", "age_range": "6-12",
        "sub_stages": [
            {"id": "g1", "name": "一年级", "age": "6-7"},
            {"id": "g2", "name": "二年级", "age": "7-8"},
            {"id": "g3", "name": "三年级", "age": "8-9"},
            {"id": "g4", "name": "四年级", "age": "9-10"},
            {"id": "g5", "name": "五年级", "age": "10-11"},
            {"id": "g6", "name": "六年级", "age": "11-12"},
        ],
        "subjects": ["语文", "数学", "英语", "科学", "道德与法治", "音乐", "美术", "体育与健康"],
        "learning_hours_per_week": 25,
    },
    "middle_school": {
        "name": "中学", "name_en": "Middle School", "age_range": "12-15",
        "sub_stages": [
            {"id": "g7", "name": "初一", "age": "12-13"},
            {"id": "g8", "name": "初二", "age": "13-14"},
            {"id": "g9", "name": "初三", "age": "14-15"},
        ],
        "subjects": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "道德与法治"],
        "learning_hours_per_week": 35,
    }
}

# ==================== 育儿园课程内容 ====================
KINDERGARTEN_COURSES = {
    "k_language": {
        "course_id": "k_language", "stage": "kindergarten", "subject": "语言发展",
        "name": "语言启蒙", "description": "儿歌、绘本、口语表达",
        "target_ages": "3-6",
        "lessons": [
            {"id": "k_lang_01", "title": "认识我自己", "content": "学习用简单的句子介绍自己的名字、年龄和喜好", "type": "story", "duration_min": 15},
            {"id": "k_lang_02", "title": "家庭成员", "content": "学习称呼爸爸、妈妈、爷爷、奶奶等家庭成员", "type": "song", "duration_min": 10},
            {"id": "k_lang_03", "title": "动物儿歌", "content": "通过儿歌学习常见动物的名称和叫声", "type": "song", "duration_min": 10},
            {"id": "k_lang_04", "title": "颜色世界", "content": "认识红、黄、蓝、绿等基本颜色", "type": "game", "duration_min": 15},
            {"id": "k_lang_05", "title": "水果乐园", "content": "学习常见水果的名称和特征", "type": "story", "duration_min": 12},
            {"id": "k_lang_06", "title": "我的好朋友", "content": "学习如何交朋友和礼貌用语", "type": "roleplay", "duration_min": 20},
            {"id": "k_lang_07", "title": "四季歌", "content": "通过儿歌认识春夏秋冬四季", "type": "song", "duration_min": 10},
            {"id": "k_lang_08", "title": "礼貌小天使", "content": "学习你好、谢谢、对不起、再见等礼貌用语", "type": "roleplay", "duration_min": 15},
        ]
    },
    "k_math": {
        "course_id": "k_math", "stage": "kindergarten", "subject": "数学启蒙",
        "name": "数学乐园", "description": "数数、形状、比较、分类",
        "target_ages": "3-6",
        "lessons": [
            {"id": "k_math_01", "title": "数数1-10", "content": "通过实物学习数1到10", "type": "game", "duration_min": 15},
            {"id": "k_math_02", "title": "认识形状", "content": "认识圆形、正方形、三角形、长方形", "type": "game", "duration_min": 15},
            {"id": "k_math_03", "title": "比大小", "content": "学习比较大、小、长、短、高、矮", "type": "game", "duration_min": 12},
            {"id": "k_math_04", "title": "颜色分类", "content": "按颜色将物品分类", "type": "game", "duration_min": 10},
            {"id": "k_math_05", "title": "数字1-20", "content": "扩展数数到20", "type": "song", "duration_min": 15},
            {"id": "k_math_06", "title": "简单加法", "content": "学习1+1=2这样的简单加法", "type": "game", "duration_min": 15},
            {"id": "k_math_07", "title": "认识星期", "content": "学习周一到周日的名称和顺序", "type": "song", "duration_min": 10},
            {"id": "k_math_08", "title": "找规律", "content": "发现简单的颜色和形状规律", "type": "game", "duration_min": 12},
        ]
    },
    "k_science": {
        "course_id": "k_science", "stage": "kindergarten", "subject": "科学探索",
        "name": "小小科学家", "description": "观察自然、认识世界、简单实验",
        "target_ages": "4-6",
        "lessons": [
            {"id": "k_sci_01", "title": "种子的秘密", "content": "观察种子发芽的过程", "type": "experiment", "duration_min": 20},
            {"id": "k_sci_02", "title": "水的魔术", "content": "了解水的三态变化", "type": "experiment", "duration_min": 20},
            {"id": "k_sci_03", "title": "认识天气", "content": "学习晴天、雨天、雪天等天气现象", "type": "story", "duration_min": 15},
            {"id": "k_sci_04", "title": "我的身体", "content": "认识身体的各个部位", "type": "song", "duration_min": 10},
            {"id": "k_sci_05", "title": "动物宝宝", "content": "认识常见动物及其幼崽", "type": "story", "duration_min": 15},
            {"id": "k_sci_06", "title": "磁铁的秘密", "content": "探索磁铁能吸什么", "type": "experiment", "duration_min": 15},
        ]
    },
    "k_art": {
        "course_id": "k_art", "stage": "kindergarten", "subject": "艺术创造",
        "name": "创意小画家", "description": "绘画、手工、折纸、创意表达",
        "target_ages": "3-6",
        "lessons": [
            {"id": "k_art_01", "title": "手指画", "content": "用手指蘸颜料创作", "type": "art", "duration_min": 20},
            {"id": "k_art_02", "title": "折纸小动物", "content": "学习折纸飞机、小船、小动物", "type": "craft", "duration_min": 25},
            {"id": "k_art_03", "title": "彩泥乐园", "content": "用彩泥捏出各种形状", "type": "craft", "duration_min": 25},
            {"id": "k_art_04", "title": "剪纸艺术", "content": "学习用安全剪刀剪出简单形状", "type": "craft", "duration_min": 20},
        ]
    },
    "k_music": {
        "course_id": "k_music", "stage": "kindergarten", "subject": "音乐律动",
        "name": "音乐小天地", "description": "儿歌、节奏、律动、乐器启蒙",
        "target_ages": "3-6",
        "lessons": [
            {"id": "k_mus_01", "title": "小星星", "content": "学唱经典儿歌《小星星》", "type": "song", "duration_min": 10},
            {"id": "k_mus_02", "title": "两只老虎", "content": "学唱《两只老虎》并做动作", "type": "song", "duration_min": 10},
            {"id": "k_mus_03", "title": "找朋友", "content": "学唱《找朋友》并玩互动游戏", "type": "game", "duration_min": 15},
            {"id": "k_mus_04", "title": "拍手歌", "content": "跟随节奏拍手和跺脚", "type": "game", "duration_min": 10},
        ]
    },
    "k_health": {
        "course_id": "k_health", "stage": "kindergarten", "subject": "健康体育",
        "name": "健康小卫士", "description": "卫生习惯、安全知识、体育锻炼",
        "target_ages": "3-6",
        "lessons": [
            {"id": "k_hlth_01", "title": "洗手歌", "content": "学习正确的洗手方法", "type": "song", "duration_min": 10},
            {"id": "k_hlth_02", "title": "安全过马路", "content": "学习交通规则和安全知识", "type": "story", "duration_min": 15},
            {"id": "k_hlth_03", "title": "健康饮食", "content": "认识健康食物和均衡饮食", "type": "game", "duration_min": 15},
            {"id": "k_hlth_04", "title": "运动时间", "content": "简单的体操和拉伸运动", "type": "exercise", "duration_min": 15},
        ]
    },
    "k_society": {
        "course_id": "k_society", "stage": "kindergarten", "subject": "社会认知",
        "name": "社会小公民", "description": "认识社区、职业、传统节日",
        "target_ages": "4-6",
        "lessons": [
            {"id": "k_soc_01", "title": "我们的社区", "content": "认识社区里的商店、医院、警察局", "type": "story", "duration_min": 15},
            {"id": "k_soc_02", "title": "职业大探索", "content": "了解医生、老师、警察等职业", "type": "roleplay", "duration_min": 20},
            {"id": "k_soc_03", "title": "春节的故事", "content": "了解春节的习俗和故事", "type": "story", "duration_min": 15},
            {"id": "k_soc_04", "title": "中秋节", "content": "了解中秋节的习俗", "type": "story", "duration_min": 15},
        ]
    },
}
KINDERGARTEN_COURSES.update({
    "k_music": {
        "course_id": "k_music", "stage": "kindergarten", "grade": "k", "subject": "音乐",
        "name": "音乐启蒙", "description": "儿歌、节奏训练、简单乐器",
        "target_ages": "3-6",
        "lessons": [
            {"id":"k_mu01","title":"小星星","content":"学唱小星星，认识音符","type":"singing","duration_min":20},
            {"id":"k_mu02","title":"两只老虎","content":"轮唱练习，节奏感培养","type":"singing","duration_min":20},
            {"id":"k_mu03","title":"拍手歌","content":"节奏拍打游戏","type":"game","duration_min":15},
            {"id":"k_mu04","title":"铃鼓和沙锤","content":"认识简单打击乐器","type":"music","duration_min":20},
            {"id":"k_mu05","title":"小毛驴","content":"学唱歌曲，动作表演","type":"singing","duration_min":20},
            {"id":"k_mu06","title":"拔萝卜","content":"合作演唱，角色扮演","type":"game","duration_min":25},
        ]
    },
    "k_art": {
        "course_id": "k_art", "stage": "kindergarten", "grade": "k", "subject": "美术",
        "name": "美术启蒙", "description": "涂鸦、手工、色彩认知",
        "target_ages": "3-6",
        "lessons": [
            {"id":"k_ar01","title":"认识颜色","content":"学习红黄蓝三原色","type":"art","duration_min":20},
            {"id":"k_ar02","title":"我的小手","content":"手掌印画","type":"craft","duration_min":20},
            {"id":"k_ar03","title":"彩虹","content":"用彩纸制作彩虹","type":"craft","duration_min":25},
            {"id":"k_ar04","title":"吹画","content":"用吸管吹出图案","type":"art","duration_min":20},
            {"id":"k_ar05","title":"黏土小动物","content":"用超轻黏土捏小动物","type":"craft","duration_min":30},
            {"id":"k_ar06","title":"美丽的蝴蝶","content":"对称剪纸","type":"craft","duration_min":25},
        ]
    },
    "k_science": {
        "course_id": "k_science", "stage": "kindergarten", "grade": "k", "subject": "科学",
        "name": "科学启蒙", "description": "自然观察、小实验、科学知识",
        "target_ages": "3-6",
        "lessons": [
            {"id":"k_sc01","title":"认识植物","content":"观察叶子形状和颜色","type":"experiment","duration_min":20},
            {"id":"k_sc02","title":"沉与浮","content":"不同物体在水中的沉浮实验","type":"experiment","duration_min":25},
            {"id":"k_sc03","title":"磁铁的秘密","content":"认识磁铁的吸引和排斥","type":"experiment","duration_min":20},
            {"id":"k_sc04","title":"小种子","content":"种豆子，观察发芽","type":"experiment","duration_min":25},
            {"id":"k_sc05","title":"认识天气","content":"晴天雨天雪天的区分","type":"lesson","duration_min":20},
            {"id":"k_sc06","title":"小动物的家","content":"了解不同动物的栖息地","type":"lesson","duration_min":20},
            {"id":"k_sc07","title":"水的三态","content":"认识冰水蒸气","type":"experiment","duration_min":25},
        ]
    },
})

# ==================== 小学课程内容 ====================
PRIMARY_COURSES = {
    # 一年级
    "p_g1_math": {
        "course_id": "p_g1_math", "stage": "primary", "grade": "g1", "subject": "数学",
        "name": "一年级数学", "description": "20以内加减法、认识图形、分类",
        "target_ages": "6-7",
        "lessons": [
            {"id": "p_g1_m01", "title": "1-5的认识", "content": "认识数字1-5，学习书写和数数", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_m02", "title": "6-10的认识", "content": "认识数字6-10，比较大小", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_m03", "title": "认识图形", "content": "认识立体图形：长方体、正方体、圆柱、球", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_m04", "title": "分类与整理", "content": "学习按不同标准分类", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_m05", "title": "10以内的加法", "content": "学习10以内的加法运算", "type": "lesson", "duration_min": 35},
            {"id": "p_g1_m06", "title": "10以内的减法", "content": "学习10以内的减法运算", "type": "lesson", "duration_min": 35},
            {"id": "p_g1_m07", "title": "11-20各数的认识", "content": "认识11-20，了解十位和个位", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_m08", "title": "20以内进位加法", "content": "学习20以内的进位加法", "type": "lesson", "duration_min": 35},
            {"id": "p_g1_m09", "title": "认识钟表", "content": "认识整时和半时", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_m10", "title": "总复习", "content": "综合练习和巩固", "type": "review", "duration_min": 40},
        ]
    },
    "p_g1_chinese": {
        "course_id": "p_g1_chinese", "stage": "primary", "grade": "g1", "subject": "语文",
        "name": "一年级语文", "description": "拼音、识字、阅读启蒙",
        "target_ages": "6-7",
        "lessons": [
            {"id": "p_g1_c01", "title": "a o e", "content": "学习单韵母a、o、e", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c02", "title": "b p m f", "content": "学习声母b、p、m、f", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c03", "title": "d t n l", "content": "学习声母d、t、n、l", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c04", "title": "g k h", "content": "学习声母g、k、h", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c05", "title": "j q x", "content": "学习声母j、q、x", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c06", "title": "zh ch sh r", "content": "学习翘舌音声母", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c07", "title": "ai ei ui", "content": "学习复韵母ai、ei、ui", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c08", "title": "识字：天地人", "content": "认识常见汉字：天、地、人、你、我、他", "type": "lesson", "duration_min": 30},
            {"id": "p_g1_c09", "title": "古诗：咏鹅", "content": "学习古诗《咏鹅》", "type": "poem", "duration_min": 25},
            {"id": "p_g1_c10", "title": "阅读理解", "content": "简单的短文阅读练习", "type": "reading", "duration_min": 30},
        ]
    },
    "p_g1_english": {
        "course_id": "p_g1_english", "stage": "primary", "grade": "g1", "subject": "英语",
        "name": "一年级英语", "description": "字母、基本词汇、简单对话",
        "target_ages": "6-7",
        "lessons": [
            {"id": "p_g1_e01", "title": "Hello!", "content": "学习问候语Hello, Hi, Goodbye", "type": "lesson", "duration_min": 25},
            {"id": "p_g1_e02", "title": "ABC Song", "content": "学习26个英文字母", "type": "song", "duration_min": 20},
            {"id": "p_g1_e03", "title": "Colors", "content": "学习颜色单词red, blue, yellow, green", "type": "lesson", "duration_min": 25},
            {"id": "p_g1_e04", "title": "Numbers 1-10", "content": "学习数字1-10的英文", "type": "lesson", "duration_min": 25},
            {"id": "p_g1_e05", "title": "My Family", "content": "学习家庭成员单词", "type": "lesson", "duration_min": 25},
            {"id": "p_g1_e06", "title": "Animals", "content": "学习常见动物英文名称", "type": "game", "duration_min": 25},
        ]
    },
    "p_g1_science": {
        "course_id": "p_g1_science", "stage": "primary", "grade": "g1", "subject": "科学",
        "name": "一年级科学", "description": "观察动物、植物、天气，认识周围世界",
        "target_ages": "6-7",
        "lessons": [
            {"id":"p_g1_s01","title":"我们周围的植物","content":"观察校园里的植物，认识根茎叶","type":"experiment","duration_min":30},
            {"id":"p_g1_s02","title":"动物的一生","content":"观察昆虫和小动物的生命周期","type":"lesson","duration_min":30},
            {"id":"p_g1_s03","title":"天气日历","content":"学习观察和记录天气变化","type":"experiment","duration_min":30},
            {"id":"p_g1_s04","title":"水和空气","content":"水的特征和空气的存在","type":"experiment","duration_min":30},
            {"id":"p_g1_s05","title":"认识岩石","content":"观察不同岩石的特征","type":"experiment","duration_min":30},
            {"id":"p_g1_s06","title":"磁铁的秘密","content":"探索磁铁能吸引什么物品","type":"experiment","duration_min":30},
        ]
    },
    "p_g2_math": {
        "course_id": "p_g2_math", "stage": "primary", "grade": "g2", "subject": "数学",
        "name": "二年级数学", "description": "长度单位、表内乘除法、角的初步认识",
        "target_ages": "7-8",
        "lessons": [
            {"id":"p_g2_m01","title":"长度单位","content":"认识厘米和米，学习用尺子测量","type":"lesson","duration_min":35},
            {"id":"p_g2_m02","title":"100以内的加减法","content":"两位数加减两位数的笔算","type":"lesson","duration_min":35},
            {"id":"p_g2_m03","title":"角的初步认识","content":"认识直角、锐角、钝角","type":"lesson","duration_min":35},
            {"id":"p_g2_m04","title":"表内乘法(一)","content":"2-6的乘法口诀","type":"lesson","duration_min":35},
            {"id":"p_g2_m05","title":"观察物体","content":"从不同角度观察物体","type":"lesson","duration_min":30},
            {"id":"p_g2_m06","title":"表内乘法(二)","content":"7-9的乘法口诀","type":"lesson","duration_min":35},
            {"id":"p_g2_m07","title":"表内除法","content":"平均分和除法初步","type":"lesson","duration_min":35},
            {"id":"p_g2_m08","title":"混合运算","content":"加减乘除混合运算","type":"lesson","duration_min":35},
            {"id":"p_g2_m09","title":"有余数的除法","content":"认识余数","type":"lesson","duration_min":35},
            {"id":"p_g2_m10","title":"克和千克","content":"认识质量单位","type":"lesson","duration_min":30},
        ]
    },
    "p_g2_chinese": {
        "course_id": "p_g2_chinese", "stage": "primary", "grade": "g2", "subject": "语文",
        "name": "二年级语文", "description": "识字写字、阅读理解、口语交际",
        "target_ages": "7-8",
        "lessons": [
            {"id":"p_g2_c01","title":"小蝌蚪找妈妈","content":"朗读课文，认识生字","type":"reading","duration_min":35},
            {"id":"p_g2_c02","title":"场景歌","content":"学习数量词和场景描写","type":"lesson","duration_min":30},
            {"id":"p_g2_c03","title":"树之歌","content":"认识不同树木的特点","type":"poem","duration_min":30},
            {"id":"p_g2_c04","title":"田家四季歌","content":"了解四季农事活动","type":"poem","duration_min":30},
            {"id":"p_g2_c05","title":"曹冲称象","content":"阅读历史故事，学习聪明智慧","type":"reading","duration_min":35},
            {"id":"p_g2_c06","title":"望庐山瀑布","content":"学习古诗，感受祖国河山","type":"poem","duration_min":30},
            {"id":"p_g2_c07","title":"日月潭","content":"阅读课文了解宝岛台湾","type":"reading","duration_min":35},
            {"id":"p_g2_c08","title":"葡萄沟","content":"了解新疆风土人情","type":"reading","duration_min":35},
            {"id":"p_g2_c09","title":"大禹治水","content":"学习神话故事","type":"reading","duration_min":30},
            {"id":"p_g2_c10","title":"难忘的泼水节","content":"了解傣族传统节日","type":"reading","duration_min":30},
        ]
    },
    # 三年级
    "p_g3_math": {
        "course_id": "p_g3_math", "stage": "primary", "grade": "g3", "subject": "数学",
        "name": "三年级数学", "description": "万以内加减法、乘法口诀、分数初步",
        "target_ages": "8-9",
        "lessons": [
            {"id": "p_g3_m01", "title": "时、分、秒", "content": "认识时间单位时分秒", "type": "lesson", "duration_min": 35},
            {"id": "p_g3_m02", "title": "万以内加减法", "content": "学习万以内数的加减法", "type": "lesson", "duration_min": 35},
            {"id": "p_g3_m03", "title": "倍的认识", "content": "理解倍的概念", "type": "lesson", "duration_min": 35},
            {"id": "p_g3_m04", "title": "多位数乘一位数", "content": "学习乘法竖式计算", "type": "lesson", "duration_min": 35},
            {"id": "p_g3_m05", "title": "长方形和正方形", "content": "学习周长计算", "type": "lesson", "duration_min": 35},
            {"id": "p_g3_m06", "title": "分数的初步认识", "content": "认识几分之一和几分之几", "type": "lesson", "duration_min": 35},
            {"id": "p_g3_m07", "title": "小数的初步认识", "content": "认识小数和简单加减", "type": "lesson", "duration_min": 35},
            {"id": "p_g3_m08", "title": "总复习", "content": "综合练习", "type": "review", "duration_min": 40},
        ]
    },
    "p_g3_chinese": {
        "course_id": "p_g3_chinese", "stage": "primary", "grade": "g3", "subject": "语文",
        "name": "三年级语文", "description": "阅读写作、古诗词、作文起步",
        "target_ages": "8-9",
        "lessons": [
            {"id":"p_g3_c01","title":"大青树下的小学","content":"阅读课文，学习描写学校生活","type":"reading","duration_min":35},
            {"id":"p_g3_c02","title":"花的学校","content":"泰戈尔散文诗欣赏","type":"reading","duration_min":30},
            {"id":"p_g3_c03","title":"不懂就要问","content":"学习孙中山勤学好问的精神","type":"reading","duration_min":30},
            {"id":"p_g3_c04","title":"古诗三首","content":"学习山行、赠刘景文、夜书所见","type":"poem","duration_min":35},
            {"id":"p_g3_c05","title":"秋天的雨","content":"描写秋天的抒情散文","type":"reading","duration_min":30},
            {"id":"p_g3_c06","title":"写日记","content":"学习日记格式和写作方法","type":"writing","duration_min":35},
            {"id":"p_g3_c07","title":"富饶的西沙群岛","content":"了解祖国南海风光","type":"reading","duration_min":35},
            {"id":"p_g3_c08","title":"海滨小城","content":"阅读课文感受海滨城市之美","type":"reading","duration_min":30},
            {"id":"p_g3_c09","title":"习作：这儿真美","content":"学习描写景物的写作方法","type":"writing","duration_min":40},
            {"id":"p_g3_c10","title":"司马光","content":"学习文言文启蒙","type":"reading","duration_min":30},
        ]
    },
    "p_g3_english": {
        "course_id": "p_g3_english", "stage": "primary", "grade": "g3", "subject": "英语",
        "name": "三年级英语", "description": "字母、基本句型、日常对话",
        "target_ages": "8-9",
        "lessons": [
            {"id":"p_g3_e01","title":"Hello!","content":"问候语、自我介绍","type":"lesson","duration_min":30},
            {"id":"p_g3_e02","title":"Colours","content":"颜色单词和句型I see...","type":"lesson","duration_min":30},
            {"id":"p_g3_e03","title":"Look at me","content":"身体部位单词和This is...句型","type":"lesson","duration_min":30},
            {"id":"p_g3_e04","title":"We love animals","content":"动物单词和What's this?句型","type":"lesson","duration_min":30},
            {"id":"p_g3_e05","title":"Let's eat","content":"食物单词和I'd like...句型","type":"lesson","duration_min":30},
            {"id":"p_g3_e06","title":"Happy birthday","content":"数字1-10和生日祝福","type":"lesson","duration_min":30},
            {"id":"p_g3_e07","title":"Where is my car","content":"方位介词in/on/under","type":"lesson","duration_min":30},
            {"id":"p_g3_e08","title":"Do you like pears","content":"水果单词和Do you like...句型","type":"lesson","duration_min":30},
        ]
    },
    "p_g3_science": {
        "course_id": "p_g3_science", "stage": "primary", "grade": "g3", "subject": "科学",
        "name": "三年级科学", "description": "植物生长、动物生命周期、天气、溶解",
        "target_ages": "8-9",
        "lessons": [
            {"id":"p_g3_s01","title":"植物种子","content":"观察种子结构，种植植物","type":"experiment","duration_min":35},
            {"id":"p_g3_s02","title":"植物生长","content":"记录植物生长变化","type":"experiment","duration_min":30},
            {"id":"p_g3_s03","title":"蚕的一生","content":"观察蚕的完全变态发育","type":"lesson","duration_min":35},
            {"id":"p_g3_s04","title":"动物的生命周期","content":"认识不同动物的生命周期","type":"lesson","duration_min":30},
            {"id":"p_g3_s05","title":"温度与水的变化","content":"测量水温，观察水的三态变化","type":"experiment","duration_min":35},
            {"id":"p_g3_s06","title":"溶解","content":"探究哪些物质能溶解","type":"experiment","duration_min":30},
            {"id":"p_g3_s07","title":"天气与气候","content":"认识天气符号和天气预报","type":"lesson","duration_min":30},
            {"id":"p_g3_s08","title":"指南针","content":"认识指南针和使用方法","type":"experiment","duration_min":30},
        ]
    },
    "p_g4_math": {
        "course_id": "p_g4_math", "stage": "primary", "grade": "g4", "subject": "数学",
        "name": "四年级数学", "description": "大数认识、三位数乘两位数、平行四边形",
        "target_ages": "9-10",
        "lessons": [
            {"id":"p_g4_m01","title":"大数的认识","content":"亿以内数的读写和比较","type":"lesson","duration_min":40},
            {"id":"p_g4_m02","title":"公顷和平方千米","content":"认识面积单位","type":"lesson","duration_min":35},
            {"id":"p_g4_m03","title":"角的度量","content":"用量角器测量角的大小","type":"lesson","duration_min":35},
            {"id":"p_g4_m04","title":"三位数乘两位数","content":"乘法笔算方法","type":"lesson","duration_min":40},
            {"id":"p_g4_m05","title":"平行四边形和梯形","content":"认识平行四边形和梯形的特征","type":"lesson","duration_min":35},
            {"id":"p_g4_m06","title":"除数是两位数的除法","content":"除法的笔算方法","type":"lesson","duration_min":40},
            {"id":"p_g4_m07","title":"条形统计图","content":"认识条形统计图","type":"lesson","duration_min":35},
            {"id":"p_g4_m08","title":"数学广角","content":"优化问题","type":"lesson","duration_min":35},
        ]
    },
    "p_g4_chinese": {
        "course_id": "p_g4_chinese", "stage": "primary", "grade": "g4", "subject": "语文",
        "name": "四年级语文", "description": "阅读鉴赏、习作表达、古诗文积累",
        "target_ages": "9-10",
        "lessons": [
            {"id":"p_g4_c01","title":"观潮","content":"学习描写钱塘江大潮","type":"reading","duration_min":35},
            {"id":"p_g4_c02","title":"走月亮","content":"散文阅读，感受亲情","type":"reading","duration_min":30},
            {"id":"p_g4_c03","title":"现代诗二首","content":"欣赏现代诗歌","type":"poem","duration_min":30},
            {"id":"p_g4_c04","title":"古诗三首","content":"学习暮江吟、题西林壁、雪梅","type":"poem","duration_min":35},
            {"id":"p_g4_c05","title":"爬山虎的脚","content":"连续观察日记","type":"reading","duration_min":30},
            {"id":"p_g4_c06","title":"蟋蟀的住宅","content":"法布尔昆虫记节选","type":"reading","duration_min":35},
            {"id":"p_g4_c07","title":"盘古开天地","content":"中国古代神话故事","type":"reading","duration_min":30},
            {"id":"p_g4_c08","title":"精卫填海","content":"文言文启蒙","type":"reading","duration_min":30},
            {"id":"p_g4_c09","title":"麻雀","content":"屠格涅夫散文阅读","type":"reading","duration_min":30},
            {"id":"p_g4_c10","title":"习作：写信","content":"学习书信格式","type":"writing","duration_min":35},
        ]
    },
    "p_g4_english": {
        "course_id": "p_g4_english", "stage": "primary", "grade": "g4", "subject": "英语",
        "name": "四年级英语", "description": "一般现在时、现在进行时、日常会话",
        "target_ages": "9-10",
        "lessons": [
            {"id":"p_g4_e01","title":"My classroom","content":"教室物品词汇和What's in...句型","type":"lesson","duration_min":30},
            {"id":"p_g4_e02","title":"My schoolbag","content":"学习用品词汇和颜色描述","type":"lesson","duration_min":30},
            {"id":"p_g4_e03","title":"My friends","content":"描述朋友的外貌和性格","type":"lesson","duration_min":30},
            {"id":"p_g4_e04","title":"My home","content":"房间名称和Where句型","type":"lesson","duration_min":30},
            {"id":"p_g4_e05","title":"Dinner's ready","content":"餐饮词汇和Would you like句型","type":"lesson","duration_min":30},
            {"id":"p_g4_e06","title":"Meet my family","content":"家庭成员和职业","type":"lesson","duration_min":30},
            {"id":"p_g4_e07","title":"Time","content":"时间表达和What time is it句型","type":"lesson","duration_min":30},
            {"id":"p_g4_e08","title":"Weather","content":"天气词汇和现在进行时初步","type":"lesson","duration_min":30},
        ]
    },
    "p_g4_science": {
        "course_id": "p_g4_science", "stage": "primary", "grade": "g4", "subject": "科学",
        "name": "四年级科学", "description": "声音、电路、岩石矿物、植物繁殖",
        "target_ages": "9-10",
        "lessons": [
            {"id":"p_g4_s01","title":"声音的产生","content":"探究声音如何产生","type":"experiment","duration_min":35},
            {"id":"p_g4_s02","title":"声音的传播","content":"声音通过不同介质传播","type":"experiment","duration_min":35},
            {"id":"p_g4_s03","title":"简易电路","content":"认识电路元件和连接方法","type":"experiment","duration_min":40},
            {"id":"p_g4_s04","title":"导体和绝缘体","content":"检测材料的导电性","type":"experiment","duration_min":35},
            {"id":"p_g4_s05","title":"岩石和矿物","content":"认识常见岩石和矿物特征","type":"lesson","duration_min":35},
            {"id":"p_g4_s06","title":"植物的繁殖","content":"认识花的结构和传粉方式","type":"experiment","duration_min":35},
            {"id":"p_g4_s07","title":"种子的传播","content":"观察不同种子的传播方式","type":"lesson","duration_min":30},
            {"id":"p_g4_s08","title":"食物中的营养","content":"认识六大营养素","type":"lesson","duration_min":30},
        ]
    },
    # 五年级
    "p_g5_math": {
        "course_id": "p_g5_math", "stage": "primary", "grade": "g5", "subject": "数学",
        "name": "五年级数学", "description": "小数乘除法、方程、多边形的面积",
        "target_ages": "10-11",
        "lessons": [
            {"id": "p_g5_m01", "title": "小数乘法", "content": "小数乘整数、小数乘小数", "type": "lesson", "duration_min": 40},
            {"id": "p_g5_m02", "title": "位置", "content": "用数对确定位置", "type": "lesson", "duration_min": 35},
            {"id": "p_g5_m03", "title": "小数除法", "content": "除数是小数的除法", "type": "lesson", "duration_min": 40},
            {"id": "p_g5_m04", "title": "可能性", "content": "认识确定现象和不确定现象", "type": "lesson", "duration_min": 30},
            {"id": "p_g5_m05", "title": "简易方程", "content": "用字母表示数、解方程", "type": "lesson", "duration_min": 40},
            {"id": "p_g5_m06", "title": "多边形的面积", "content": "平行四边形、三角形、梯形面积", "type": "lesson", "duration_min": 40},
            {"id": "p_g5_m07", "title": "植树问题", "content": "学习植树问题的三种情况", "type": "lesson", "duration_min": 35},
            {"id": "p_g5_m08", "title": "总复习", "content": "综合练习", "type": "review", "duration_min": 40},
        ]
    },
    "p_g5_english": {
        "course_id": "p_g5_english", "stage": "primary", "grade": "g5", "subject": "英语",
        "name": "五年级英语", "description": "一般现在时、现在进行时、短文写作",
        "target_ages": "10-11",
        "lessons": [
            {"id": "p_g5_e01", "title": "My Day", "content": "学习描述日常作息", "type": "lesson", "duration_min": 35},
            {"id": "p_g5_e02", "title": "Present Simple", "content": "一般现在时语法", "type": "lesson", "duration_min": 35},
            {"id": "p_g5_e03", "title": "Present Continuous", "content": "现在进行时语法", "type": "lesson", "duration_min": 35},
            {"id": "p_g5_e04", "title": "My Favorite Season", "content": "描述最喜欢的季节", "type": "writing", "duration_min": 30},
            {"id": "p_g5_e05", "title": "There be句型", "content": "学习There is/are句型", "type": "lesson", "duration_min": 30},
            {"id": "p_g5_e06", "title": "Reading Comprehension", "content": "短文阅读理解和回答问题", "type": "reading", "duration_min": 35},
        ]
    },
    "p_g5_chinese": {
        "course_id": "p_g5_chinese", "stage": "primary", "grade": "g5", "subject": "语文",
        "name": "五年级语文", "description": "文学阅读、说明文、古诗词、作文提高",
        "target_ages": "10-11",
        "lessons": [
            {"id":"p_g5_c01","title":"白鹭","content":"郭沫若散文欣赏","type":"reading","duration_min":35},
            {"id":"p_g5_c02","title":"落花生","content":"借物喻人的写作方法","type":"reading","duration_min":30},
            {"id":"p_g5_c03","title":"桂花雨","content":"思念家乡的抒情散文","type":"reading","duration_min":30},
            {"id":"p_g5_c04","title":"将相和","content":"历史故事阅读","type":"reading","duration_min":35},
            {"id":"p_g5_c05","title":"猎人海力布","content":"民间故事阅读","type":"reading","duration_min":30},
            {"id":"p_g5_c06","title":"少年中国说","content":"梁启超名篇节选","type":"reading","duration_min":35},
            {"id":"p_g5_c07","title":"圆明园的毁灭","content":"爱国主义教育课文","type":"reading","duration_min":35},
            {"id":"p_g5_c08","title":"古诗三首","content":"学习示儿、题临安邸、己亥杂诗","type":"poem","duration_min":35},
            {"id":"p_g5_c09","title":"四季之美","content":"清少纳言散文阅读","type":"reading","duration_min":30},
            {"id":"p_g5_c10","title":"习作：推荐一本书","content":"学习写读后感","type":"writing","duration_min":35},
        ]
    },
    "p_g5_science": {
        "course_id": "p_g5_science", "stage": "primary", "grade": "g5", "subject": "科学",
        "name": "五年级科学", "description": "光、地球运动、生物与环境、沉浮",
        "target_ages": "10-11",
        "lessons": [
            {"id":"p_g5_s01","title":"光的传播","content":"探究光沿直线传播","type":"experiment","duration_min":35},
            {"id":"p_g5_s02","title":"光的反射","content":"认识反射现象","type":"experiment","duration_min":35},
            {"id":"p_g5_s03","title":"地球的自转","content":"理解昼夜交替现象","type":"lesson","duration_min":35},
            {"id":"p_g5_s04","title":"地球的公转","content":"理解四季变化原因","type":"lesson","duration_min":35},
            {"id":"p_g5_s05","title":"生态系统","content":"认识食物链和食物网","type":"lesson","duration_min":35},
            {"id":"p_g5_s06","title":"人类对环境的影响","content":"认识环境保护重要性","type":"lesson","duration_min":30},
            {"id":"p_g5_s07","title":"沉与浮","content":"探究物体沉浮条件","type":"experiment","duration_min":35},
            {"id":"p_g5_s08","title":"热传递","content":"认识传导、对流、辐射","type":"experiment","duration_min":35},
        ]
    },
    "p_g6_math": {
        "course_id": "p_g6_math", "stage": "primary", "grade": "g6", "subject": "数学",
        "name": "六年级数学", "description": "分数乘除法、圆、百分数、比例、负数",
        "target_ages": "11-12",
        "lessons": [
            {"id":"p_g6_m01","title":"分数乘法","content":"分数乘整数和分数","type":"lesson","duration_min":40},
            {"id":"p_g6_m02","title":"位置与方向","content":"用方向和距离确定位置","type":"lesson","duration_min":35},
            {"id":"p_g6_m03","title":"分数除法","content":"分数除法的计算方法","type":"lesson","duration_min":40},
            {"id":"p_g6_m04","title":"比","content":"比的意义和基本性质","type":"lesson","duration_min":35},
            {"id":"p_g6_m05","title":"圆","content":"圆的周长和面积","type":"lesson","duration_min":40},
            {"id":"p_g6_m06","title":"百分数","content":"百分数的意义和应用","type":"lesson","duration_min":35},
            {"id":"p_g6_m07","title":"负数","content":"认识负数","type":"lesson","duration_min":30},
            {"id":"p_g6_m08","title":"比例","content":"比例的意义和基本性质","type":"lesson","duration_min":40},
            {"id":"p_g6_m09","title":"鸽巢问题","content":"抽屉原理初步","type":"lesson","duration_min":30},
            {"id":"p_g6_m10","title":"总复习","content":"小学阶段知识整理","type":"review","duration_min":45},
        ]
    },
    "p_g6_chinese": {
        "course_id": "p_g6_chinese", "stage": "primary", "grade": "g6", "subject": "语文",
        "name": "六年级语文", "description": "文学鉴赏、文言文、议论文启蒙",
        "target_ages": "11-12",
        "lessons": [
            {"id":"p_g6_c01","title":"草原","content":"老舍散文阅读","type":"reading","duration_min":35},
            {"id":"p_g6_c02","title":"丁香结","content":"宗璞散文欣赏","type":"reading","duration_min":30},
            {"id":"p_g6_c03","title":"古诗词三首","content":"学习宿建德江、六月二十七日望湖楼醉书、西江月","type":"poem","duration_min":35},
            {"id":"p_g6_c04","title":"狼牙山五壮士","content":"革命传统教育","type":"reading","duration_min":35},
            {"id":"p_g6_c05","title":"开国大典","content":"了解新中国成立的伟大时刻","type":"reading","duration_min":35},
            {"id":"p_g6_c06","title":"桥","content":"微型小说阅读","type":"reading","duration_min":30},
            {"id":"p_g6_c07","title":"穷人","content":"列夫托尔斯泰作品阅读","type":"reading","duration_min":35},
            {"id":"p_g6_c08","title":"伯牙鼓琴","content":"文言文阅读","type":"reading","duration_min":30},
            {"id":"p_g6_c09","title":"月光曲","content":"贝多芬的故事","type":"reading","duration_min":30},
            {"id":"p_g6_c10","title":"习作：变形记","content":"想象作文写作","type":"writing","duration_min":35},
        ]
    },
    "p_g6_english": {
        "course_id": "p_g6_english", "stage": "primary", "grade": "g6", "subject": "英语",
        "name": "六年级英语", "description": "过去时、比较级、阅读写作提升",
        "target_ages": "11-12",
        "lessons": [
            {"id":"p_g6_e01","title":"How can I get there","content":"问路指路句型","type":"lesson","duration_min":35},
            {"id":"p_g6_e02","title":"Ways to go to school","content":"交通方式表达","type":"lesson","duration_min":35},
            {"id":"p_g6_e03","title":"My weekend plan","content":"一般将来时be going to","type":"lesson","duration_min":35},
            {"id":"p_g6_e04","title":"I have a pen pal","content":"描述兴趣爱好","type":"lesson","duration_min":30},
            {"id":"p_g6_e05","title":"What does he do","content":"职业词汇和一般现在时第三人称","type":"lesson","duration_min":35},
            {"id":"p_g6_e06","title":"How do you feel","content":"情感词汇和建议句型","type":"lesson","duration_min":30},
            {"id":"p_g6_e07","title":"Last weekend","content":"一般过去时","type":"lesson","duration_min":35},
            {"id":"p_g6_e08","title":"Where did you go","content":"过去时特殊疑问句","type":"lesson","duration_min":35},
        ]
    },
    "p_g6_science": {
        "course_id": "p_g6_science", "stage": "primary", "grade": "g6", "subject": "科学",
        "name": "六年级科学", "description": "工具机械、形状结构、能量、宇宙",
        "target_ages": "11-12",
        "lessons": [
            {"id":"p_g6_s01","title":"杠杆","content":"认识杠杆原理和生活中的应用","type":"experiment","duration_min":35},
            {"id":"p_g6_s02","title":"滑轮","content":"认识定滑轮和动滑轮","type":"experiment","duration_min":35},
            {"id":"p_g6_s03","title":"斜面","content":"认识斜面的省力原理","type":"experiment","duration_min":30},
            {"id":"p_g6_s04","title":"形状与结构","content":"探究不同形状的承重能力","type":"experiment","duration_min":35},
            {"id":"p_g6_s05","title":"电能","content":"认识电能的来源和转化","type":"lesson","duration_min":35},
            {"id":"p_g6_s06","title":"太阳能","content":"认识太阳能的利用","type":"lesson","duration_min":30},
            {"id":"p_g6_s07","title":"太阳系","content":"认识太阳系八大行星","type":"lesson","duration_min":35},
            {"id":"p_g6_s08","title":"宇宙探索","content":"了解人类探索宇宙的历程","type":"lesson","duration_min":30},
        ]
    },
}
PRIMARY_COURSES.update({
    "p_g5_math": {
        "course_id": "p_g5_math", "stage": "primary", "grade": "g5", "subject": "数学",
        "name": "五年级数学", "description": "小数乘除法、简易方程、多边形面积",
        "target_ages": "10-11",
        "lessons": [
            {"id":"p_g5_m01","title":"小数乘法","content":"小数乘以整数和小数的计算方法","type":"lesson","duration_min":40},
            {"id":"p_g5_m02","title":"小数除法","content":"除数是小数的除法","type":"lesson","duration_min":40},
            {"id":"p_g5_m03","title":"可能性","content":"认识概率的基本概念","type":"lesson","duration_min":35},
            {"id":"p_g5_m04","title":"简易方程","content":"用字母表示数和方程","type":"lesson","duration_min":40},
            {"id":"p_g5_m05","title":"多边形的面积","content":"平行四边形、三角形、梯形面积","type":"lesson","duration_min":40},
            {"id":"p_g5_m06","title":"因数与倍数","content":"质数、合数、最大公因数","type":"lesson","duration_min":35},
            {"id":"p_g5_m07","title":"分数的意义和性质","content":"分数的大小比较和约分","type":"lesson","duration_min":40},
            {"id":"p_g5_m08","title":"图形的运动","content":"轴对称和平移","type":"lesson","duration_min":35},
        ]
    },
    "p_g5_chinese": {
        "course_id": "p_g5_chinese", "stage": "primary", "grade": "g5", "subject": "语文",
        "name": "五年级语文", "description": "经典名篇、阅读策略、创意写作",
        "target_ages": "10-11",
        "lessons": [
            {"id":"p_g5_c01","title":"白鹭","content":"郭沫若散文欣赏","type":"reading","duration_min":35},
            {"id":"p_g5_c02","title":"落花生","content":"借物喻人的写作手法","type":"reading","duration_min":30},
            {"id":"p_g5_c03","title":"桂花雨","content":"散文阅读与情感体验","type":"reading","duration_min":30},
            {"id":"p_g5_c04","title":"猎人海力布","content":"民间故事阅读","type":"reading","duration_min":30},
            {"id":"p_g5_c05","title":"牛郎织女","content":"中国四大民间故事之一","type":"reading","duration_min":35},
            {"id":"p_g5_c06","title":"少年中国说","content":"梁启超名篇朗诵","type":"reading","duration_min":35},
            {"id":"p_g5_c07","title":"圆明园的毁灭","content":"历史主题阅读","type":"reading","duration_min":35},
            {"id":"p_g5_c08","title":"习作：推荐一本书","content":"学习议论文基础写法","type":"writing","duration_min":35},
            {"id":"p_g5_c09","title":"古诗三首","content":"示儿、题临安邸、己亥杂诗","type":"poem","duration_min":35},
            {"id":"p_g5_c10","title":"忆读书","content":"冰心散文阅读","type":"reading","duration_min":30},
        ]
    },
    "p_g5_english": {
        "course_id": "p_g5_english", "stage": "primary", "grade": "g5", "subject": "英语",
        "name": "五年级英语", "description": "一般现在时、there be句式、日常对话",
        "target_ages": "10-11",
        "lessons": [
            {"id":"p_g5_e01","title":"My Day","content":"描述日常作息","type":"dialogue","duration_min":35},
            {"id":"p_g5_e02","title":"Seasons","content":"谈论季节和天气","type":"dialogue","duration_min":30},
            {"id":"p_g5_e03","title":"There is a river","content":"there be句式","type":"lesson","duration_min":30},
            {"id":"p_g5_e04","title":"School Trip","content":"学校旅行话题交流","type":"dialogue","duration_min":35},
            {"id":"p_g5_e05","title":"Whose dog?","content":"名词所有格和物主代词","type":"lesson","duration_min":30},
            {"id":"p_g5_e06","title":"In a nature park","content":"自然公园主题","type":"dialogue","duration_min":35},
            {"id":"p_g5_e07","title":"Phonics Review","content":"自然拼读综合复习","type":"exercise","duration_min":30},
            {"id":"p_g5_e08","title":"My Favourite Season","content":"写作：最喜欢的季节","type":"writing","duration_min":35},
        ]
    },
    "p_g6_math": {
        "course_id": "p_g6_math", "stage": "primary", "grade": "g6", "subject": "数学",
        "name": "六年级数学", "description": "分数混合运算、圆、百分数、比例",
        "target_ages": "11-12",
        "lessons": [
            {"id":"p_g6_m01","title":"分数乘法","content":"分数乘整数和分数","type":"lesson","duration_min":40},
            {"id":"p_g6_m02","title":"分数除法","content":"分数除以整数和分数","type":"lesson","duration_min":40},
            {"id":"p_g6_m03","title":"比","content":"比的意义和基本性质","type":"lesson","duration_min":35},
            {"id":"p_g6_m04","title":"圆","content":"圆的认识和周长面积计算","type":"lesson","duration_min":40},
            {"id":"p_g6_m05","title":"百分数","content":"百分数的意义和计算","type":"lesson","duration_min":35},
            {"id":"p_g6_m06","title":"扇形统计图","content":"认识扇形统计图","type":"lesson","duration_min":35},
            {"id":"p_g6_m07","title":"负数","content":"认识负数及数轴表示","type":"lesson","duration_min":35},
            {"id":"p_g6_m08","title":"比例","content":"比例的意义和基本性质","type":"lesson","duration_min":40},
            {"id":"p_g6_m09","title":"鸽巢问题","content":"抽屉原理初步","type":"lesson","duration_min":35},
            {"id":"p_g6_m10","title":"整理与复习","content":"小学阶段数学综合复习","type":"exercise","duration_min":45},
        ]
    },
    "p_g6_chinese": {
        "course_id": "p_g6_chinese", "stage": "primary", "grade": "g6", "subject": "语文",
        "name": "六年级语文", "description": "名著导读、文言文、毕业综合",
        "target_ages": "11-12",
        "lessons": [
            {"id":"p_g6_c01","title":"草原","content":"老舍散文阅读","type":"reading","duration_min":35},
            {"id":"p_g6_c02","title":"丁香结","content":"宗璞散文阅读","type":"reading","duration_min":30},
            {"id":"p_g6_c03","title":"花之歌","content":"纪伯伦散文诗欣赏","type":"poem","duration_min":30},
            {"id":"p_g6_c04","title":"七律·长征","content":"毛泽东诗词","type":"poem","duration_min":35},
            {"id":"p_g6_c05","title":"狼牙山五壮士","content":"革命题材阅读","type":"reading","duration_min":35},
            {"id":"p_g6_c06","title":"开国大典","content":"记叙文阅读","type":"reading","duration_min":30},
            {"id":"p_g6_c07","title":"桥","content":"小说阅读","type":"reading","duration_min":35},
            {"id":"p_g6_c08","title":"穷人","content":"列夫·托尔斯泰短篇小说","type":"reading","duration_min":35},
            {"id":"p_g6_c09","title":"伯牙鼓琴","content":"文言文阅读","type":"reading","duration_min":30},
            {"id":"p_g6_c10","title":"月光曲","content":"贝多芬故事阅读","type":"reading","duration_min":30},
            {"id":"p_g6_c11","title":"习作：毕业感言","content":"毕业主题写作","type":"writing","duration_min":35},
            {"id":"p_g6_c12","title":"古诗词背诵","content":"小学古诗文汇总复习","type":"poem","duration_min":40},
        ]
    },
    "p_g6_english": {
        "course_id": "p_g6_english", "stage": "primary", "grade": "g6", "subject": "英语",
        "name": "六年级英语", "description": "一般过去时、比较级、旅行话题",
        "target_ages": "11-12",
        "lessons": [
            {"id":"p_g6_e01","title":"How can I get there?","content":"问路和指路","type":"dialogue","duration_min":35},
            {"id":"p_g6_e02","title":"Ways to go to school","content":"交通方式话题","type":"lesson","duration_min":30},
            {"id":"p_g6_e03","title":"My weekend plan","content":"一般将来时","type":"lesson","duration_min":35},
            {"id":"p_g6_e04","title":"What does he do?","content":"职业话题","type":"dialogue","duration_min":30},
            {"id":"p_g6_e05","title":"Let's talk about hobbies","content":"爱好话题扩展","type":"dialogue","duration_min":35},
            {"id":"p_g6_e06","title":"Then and now","content":"过去和现在对比","type":"writing","duration_min":35},
            {"id":"p_g6_e07","title":"Comparative adjectives","content":"比较级的用法","type":"lesson","duration_min":30},
            {"id":"p_g6_e08","title":"Summer vacation plans","content":"暑假计划写作","type":"writing","duration_min":35},
        ]
    },
})

# ==================== 中学课程内容 ====================
MIDDLE_SCHOOL_COURSES = {
    "m_g7_math": {
        "course_id": "m_g7_math", "stage": "middle_school", "grade": "g7", "subject": "数学",
        "name": "初一数学", "description": "有理数、整式、一元一次方程",
        "target_ages": "12-13",
        "lessons": [
            {"id": "m_g7_m01", "title": "正数和负数", "content": "认识正数、负数、数轴", "type": "lesson", "duration_min": 45},
            {"id": "m_g7_m02", "title": "有理数加减法", "content": "有理数的加法、减法法则", "type": "lesson", "duration_min": 45},
            {"id": "m_g7_m03", "title": "有理数乘除法", "content": "有理数的乘法和除法", "type": "lesson", "duration_min": 45},
            {"id": "m_g7_m04", "title": "整式", "content": "单项式、多项式、同类项", "type": "lesson", "duration_min": 45},
            {"id": "m_g7_m05", "title": "一元一次方程", "content": "解一元一次方程及应用题", "type": "lesson", "duration_min": 45},
            {"id": "m_g7_m06", "title": "图形认识初步", "content": "立体图形与平面图形", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_m07", "title": "数据的收集与整理", "content": "统计调查、直方图", "type": "lesson", "duration_min": 40},
        ]
    },
    "m_g7_english": {
        "course_id": "m_g7_english", "stage": "middle_school", "grade": "g7", "subject": "英语",
        "name": "初一英语", "description": "be动词、一般现在时、人称代词",
        "target_ages": "12-13",
        "lessons": [
            {"id": "m_g7_e01", "title": "Personal Pronouns", "content": "主格宾格物主代词", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_e02", "title": "Verb to be", "content": "be动词的用法", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_e03", "title": "Present Simple Tense", "content": "一般现在时第三人称单数", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_e04", "title": "There be Structure", "content": "There be句型的肯定否定疑问", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_e05", "title": "My School Life", "content": "描述学校生活的短文写作", "type": "writing", "duration_min": 35},
        ]
    },
    "m_g7_history": {
        "course_id": "m_g7_history", "stage": "middle_school", "grade": "g7", "subject": "历史",
        "name": "初一历史", "description": "中国古代史（史前-魏晋）",
        "target_ages": "12-13",
        "lessons": [
            {"id": "m_g7_h01", "title": "中国早期人类", "content": "元谋人、北京人的发现和生活", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_h02", "title": "原始农耕生活", "content": "河姆渡人和半坡人的农耕生活", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_h03", "title": "夏商周的更替", "content": "夏朝的建立、商周文明", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_h04", "title": "春秋争霸", "content": "春秋五霸、战国七雄", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_h05", "title": "秦统一中国", "content": "秦始皇统一六国和中央集权", "type": "lesson", "duration_min": 40},
            {"id": "m_g7_h06", "title": "丝绸之路", "content": "张骞出使西域和丝绸之路", "type": "lesson", "duration_min": 40},
        ]
    },
    "m_g7_chinese": {
        "course_id": "m_g7_chinese", "stage": "middle_school", "grade": "g7", "subject": "语文",
        "name": "初一语文", "description": "现代文阅读、文言文基础、写作训练",
        "target_ages": "12-13",
        "lessons": [
            {"id":"m_g7_c01","title":"春","content":"朱自清散文精读","type":"reading","duration_min":45},
            {"id":"m_g7_c02","title":"济南的冬天","content":"老舍散文欣赏","type":"reading","duration_min":40},
            {"id":"m_g7_c03","title":"古代诗歌四首","content":"学习观沧海、次北固山下等","type":"poem","duration_min":40},
            {"id":"m_g7_c04","title":"世说新语二则","content":"文言文阅读入门","type":"reading","duration_min":40},
            {"id":"m_g7_c05","title":"从百草园到三味书屋","content":"鲁迅散文阅读","type":"reading","duration_min":45},
            {"id":"m_g7_c06","title":"论语十二章","content":"儒家经典学习","type":"reading","duration_min":40},
            {"id":"m_g7_c07","title":"皇帝的新装","content":"安徒生童话阅读","type":"reading","duration_min":35},
            {"id":"m_g7_c08","title":"天上的街市","content":"郭沫若诗歌欣赏","type":"poem","duration_min":30},
            {"id":"m_g7_c09","title":"诫子书","content":"诸葛亮家书学习","type":"reading","duration_min":35},
            {"id":"m_g7_c10","title":"狼","content":"蒲松龄文言小说","type":"reading","duration_min":35},
        ]
    },
    "m_g7_science": {
        "course_id": "m_g7_science", "stage": "middle_school", "grade": "g7", "subject": "科学",
        "name": "初一科学", "description": "生物基础、细胞、植物、动物分类",
        "target_ages": "12-13",
        "lessons": [
            {"id":"m_g7_s01","title":"认识生物","content":"生物的共同特征","type":"lesson","duration_min":40},
            {"id":"m_g7_s02","title":"显微镜的使用","content":"学习使用光学显微镜","type":"experiment","duration_min":45},
            {"id":"m_g7_s03","title":"细胞的结构","content":"认识动植物细胞结构","type":"lesson","duration_min":40},
            {"id":"m_g7_s04","title":"细胞的分裂与生长","content":"了解细胞生命活动","type":"lesson","duration_min":40},
            {"id":"m_g7_s05","title":"植物体的结构层次","content":"从细胞到植物体","type":"lesson","duration_min":35},
            {"id":"m_g7_s06","title":"动物体的结构层次","content":"从细胞到动物体","type":"lesson","duration_min":35},
            {"id":"m_g7_s07","title":"种子植物","content":"裸子和被子植物","type":"lesson","duration_min":40},
            {"id":"m_g7_s08","title":"孢子植物","content":"藻类、苔藓、蕨类","type":"lesson","duration_min":35},
        ]
    },
    "m_g7_geography": {
        "course_id": "m_g7_geography", "stage": "middle_school", "grade": "g7", "subject": "地理",
        "name": "初一地理", "description": "地球与地图、世界地理",
        "target_ages": "12-13",
        "lessons": [
            {"id":"m_g7_g01","title":"地球的形状和大小","content":"认识地球仪和经纬网","type":"lesson","duration_min":40},
            {"id":"m_g7_g02","title":"地图的阅读","content":"认识地图三要素","type":"lesson","duration_min":40},
            {"id":"m_g7_g03","title":"地形图的判读","content":"等高线地形图","type":"lesson","duration_min":40},
            {"id":"m_g7_g04","title":"海陆分布","content":"七大洲四大洋","type":"lesson","duration_min":35},
            {"id":"m_g7_g05","title":"海陆变迁","content":"板块构造学说","type":"lesson","duration_min":35},
            {"id":"m_g7_g06","title":"天气与气候","content":"气温和降水的分布","type":"lesson","duration_min":40},
            {"id":"m_g7_g07","title":"世界人口","content":"人口增长和分布","type":"lesson","duration_min":35},
            {"id":"m_g7_g08","title":"世界聚落","content":"城市和乡村","type":"lesson","duration_min":30},
        ]
    },
    "m_g7_morality": {
        "course_id": "m_g7_morality", "stage": "middle_school", "grade": "g7", "subject": "道德与法治",
        "name": "初一道德与法治", "description": "青春成长、情绪管理、集体生活",
        "target_ages": "12-13",
        "lessons": [
            {"id":"m_g7_d01","title":"青春的邀约","content":"认识青春期的身体和心理变化","type":"lesson","duration_min":40},
            {"id":"m_g7_d02","title":"青春的心弦","content":"男女同学正常交往","type":"lesson","duration_min":35},
            {"id":"m_g7_d03","title":"青春的证明","content":"培养自信自强的品质","type":"lesson","duration_min":35},
            {"id":"m_g7_d04","title":"揭开情绪的面纱","content":"认识情绪和合理表达","type":"lesson","duration_min":40},
            {"id":"m_g7_d05","title":"品出情感的韵味","content":"培养积极情感","type":"lesson","duration_min":35},
            {"id":"m_g7_d06","title":"集体生活邀请我","content":"认识集体的力量","type":"lesson","duration_min":35},
            {"id":"m_g7_d07","title":"共奏和谐乐章","content":"处理个人与集体的关系","type":"lesson","duration_min":35},
            {"id":"m_g7_d08","title":"法律保障生活","content":"认识法律的特征和作用","type":"lesson","duration_min":40},
        ]
    },
    "m_g8_math": {
        "course_id": "m_g8_math", "stage": "middle_school", "grade": "g8", "subject": "数学",
        "name": "初二数学", "description": "三角形、全等三角形、轴对称、整式乘除、分式",
        "target_ages": "13-14",
        "lessons": [
            {"id":"m_g8_m01","title":"三角形","content":"三角形三边关系、内角和","type":"lesson","duration_min":45},
            {"id":"m_g8_m02","title":"全等三角形","content":"全等三角形的判定SSS/SAS/ASA/AAS","type":"lesson","duration_min":45},
            {"id":"m_g8_m03","title":"角的平分线","content":"角平分线的性质","type":"lesson","duration_min":40},
            {"id":"m_g8_m04","title":"轴对称","content":"轴对称图形和线段垂直平分线","type":"lesson","duration_min":40},
            {"id":"m_g8_m05","title":"整式的乘法与因式分解","content":"幂运算和因式分解","type":"lesson","duration_min":45},
            {"id":"m_g8_m06","title":"分式","content":"分式运算和分式方程","type":"lesson","duration_min":45},
            {"id":"m_g8_m07","title":"二次根式","content":"二次根式的性质和运算","type":"lesson","duration_min":40},
            {"id":"m_g8_m08","title":"勾股定理","content":"勾股定理及其逆定理","type":"lesson","duration_min":40},
            {"id":"m_g8_m09","title":"平行四边形","content":"平行四边形性质和判定","type":"lesson","duration_min":45},
            {"id":"m_g8_m10","title":"一次函数","content":"函数的定义和一次函数图像","type":"lesson","duration_min":45},
        ]
    },
    "m_g8_chinese": {
        "course_id": "m_g8_chinese", "stage": "middle_school", "grade": "g8", "subject": "语文",
        "name": "初二语文", "description": "新闻阅读、散文、说明文、文言文",
        "target_ages": "13-14",
        "lessons": [
            {"id":"m_g8_c01","title":"消息二则","content":"我三十万大军胜利南渡长江","type":"reading","duration_min":40},
            {"id":"m_g8_c02","title":"藤野先生","content":"鲁迅散文阅读","type":"reading","duration_min":45},
            {"id":"m_g8_c03","title":"回忆我的母亲","content":"朱德散文阅读","type":"reading","duration_min":40},
            {"id":"m_g8_c04","title":"三峡","content":"郦道元文言文","type":"reading","duration_min":40},
            {"id":"m_g8_c05","title":"答谢中书书","content":"陶弘景书信体文言文","type":"reading","duration_min":35},
            {"id":"m_g8_c06","title":"与朱元思书","content":"吴均骈文","type":"reading","duration_min":35},
            {"id":"m_g8_c07","title":"背影","content":"朱自清经典散文","type":"reading","duration_min":45},
            {"id":"m_g8_c08","title":"白杨礼赞","content":"茅盾散文象征手法","type":"reading","duration_min":40},
            {"id":"m_g8_c09","title":"中国石拱桥","content":"说明文阅读","type":"reading","duration_min":35},
            {"id":"m_g8_c10","title":"生于忧患死于安乐","content":"孟子文言文","type":"reading","duration_min":40},
        ]
    },
    "m_g8_english": {
        "course_id": "m_g8_english", "stage": "middle_school", "grade": "g8", "subject": "英语",
        "name": "初二英语", "description": "比较级最高级、一般过去时、阅读写作",
        "target_ages": "13-14",
        "lessons": [
            {"id":"m_g8_e01","title":"Where did you go on vacation","content":"过去时假期表达","type":"lesson","duration_min":40},
            {"id":"m_g8_e02","title":"How often do you exercise","content":"频率副词和运动词汇","type":"lesson","duration_min":35},
            {"id":"m_g8_e03","title":"I'm more outgoing than my sister","content":"形容词比较级","type":"lesson","duration_min":40},
            {"id":"m_g8_e04","title":"What's the best movie theater","content":"形容词最高级","type":"lesson","duration_min":35},
            {"id":"m_g8_e05","title":"Do you want to watch a game show","content":"动词不定式作宾语","type":"lesson","duration_min":40},
            {"id":"m_g8_e06","title":"I'm going to study computer science","content":"一般将来时","type":"lesson","duration_min":35},
            {"id":"m_g8_e07","title":"Will people have robots","content":"一般将来时will","type":"lesson","duration_min":35},
            {"id":"m_g8_e08","title":"How do you make a banana milkshake","content":"祈使句和顺序表达","type":"lesson","duration_min":30},
            {"id":"m_g8_e09","title":"An old man tried to move the mountains","content":"讲故事过去时","type":"lesson","duration_min":35},
            {"id":"m_g8_e10","title":"Have you ever been to a museum","content":"现在完成时","type":"lesson","duration_min":40},
        ]
    },
    "m_g8_biology": {
        "course_id": "m_g8_biology", "stage": "middle_school", "grade": "g8", "subject": "生物",
        "name": "初二生物", "description": "生物圈、动物运动、行为、分类、遗传",
        "target_ages": "13-14",
        "lessons": [
            {"id":"m_g8_b01","title":"动物的运动","content":"运动系统的组成","type":"lesson","duration_min":40},
            {"id":"m_g8_b02","title":"先天性行为和学习行为","content":"区分两种行为类型","type":"lesson","duration_min":35},
            {"id":"m_g8_b03","title":"动物在生物圈中的作用","content":"动物在生态平衡中的角色","type":"lesson","duration_min":35},
            {"id":"m_g8_b04","title":"细菌和真菌","content":"微生物的结构和繁殖","type":"lesson","duration_min":40},
            {"id":"m_g8_b05","title":"病毒","content":"病毒的结构和生活方式","type":"lesson","duration_min":35},
            {"id":"m_g8_b06","title":"生物分类","content":"从界到种的分类等级","type":"lesson","duration_min":40},
            {"id":"m_g8_b07","title":"生物的生殖","content":"有性生殖和无性生殖","type":"lesson","duration_min":40},
            {"id":"m_g8_b08","title":"基因的显性和隐性","content":"孟德尔遗传定律","type":"lesson","duration_min":45},
        ]
    },
    "m_g8_geography": {
        "course_id": "m_g8_geography", "stage": "middle_school", "grade": "g8", "subject": "地理",
        "name": "初二地理", "description": "中国地理总论、区域地理",
        "target_ages": "13-14",
        "lessons": [
            {"id":"m_g8_g01","title":"中国的疆域","content":"地理位置和领土面积","type":"lesson","duration_min":40},
            {"id":"m_g8_g02","title":"中国的行政区划","content":"34个省级行政区","type":"lesson","duration_min":40},
            {"id":"m_g8_g03","title":"中国的人口","content":"人口分布和民族","type":"lesson","duration_min":35},
            {"id":"m_g8_g04","title":"中国的地形","content":"三级阶梯和主要山脉","type":"lesson","duration_min":40},
            {"id":"m_g8_g05","title":"中国的气候","content":"温度带和干湿区","type":"lesson","duration_min":40},
            {"id":"m_g8_g06","title":"中国的河流","content":"长江黄河概况","type":"lesson","duration_min":40},
            {"id":"m_g8_g07","title":"中国的自然资源","content":"土地资源和水资源","type":"lesson","duration_min":35},
            {"id":"m_g8_g08","title":"北方地区","content":"北方自然和人文特征","type":"lesson","duration_min":35},
            {"id":"m_g8_g09","title":"南方地区","content":"南方自然和人文特征","type":"lesson","duration_min":35},
            {"id":"m_g8_g10","title":"西北和青藏地区","content":"西北干旱和青藏高寒","type":"lesson","duration_min":35},
        ]
    },
    "m_g8_history": {
        "course_id": "m_g8_history", "stage": "middle_school", "grade": "g8", "subject": "历史",
        "name": "初二历史", "description": "中国近代史（鸦片战争-新中国成立）",
        "target_ages": "13-14",
        "lessons": [
            {"id":"m_g8_h01","title":"鸦片战争","content":"鸦片战争爆发原因和《南京条约》","type":"lesson","duration_min":40},
            {"id":"m_g8_h02","title":"第二次鸦片战争","content":"火烧圆明园","type":"lesson","duration_min":35},
            {"id":"m_g8_h03","title":"太平天国运动","content":"太平天国兴衰","type":"lesson","duration_min":35},
            {"id":"m_g8_h04","title":"洋务运动","content":"自强求富的近代化尝试","type":"lesson","duration_min":40},
            {"id":"m_g8_h05","title":"甲午中日战争","content":"《马关条约》和台湾割让","type":"lesson","duration_min":40},
            {"id":"m_g8_h06","title":"戊戌变法","content":"百日维新","type":"lesson","duration_min":35},
            {"id":"m_g8_h07","title":"辛亥革命","content":"孙中山和武昌起义","type":"lesson","duration_min":40},
            {"id":"m_g8_h08","title":"五四运动","content":"新民主主义革命开端","type":"lesson","duration_min":40},
            {"id":"m_g8_h09","title":"中国共产党的诞生","content":"中共一大","type":"lesson","duration_min":35},
            {"id":"m_g8_h10","title":"抗日战争","content":"十四年抗战历程","type":"lesson","duration_min":45},
        ]
    },
    "m_g8_physics": {
        "course_id": "m_g8_physics", "stage": "middle_school", "grade": "g8", "subject": "物理",
        "name": "初二物理", "description": "机械运动、声现象、光现象",
        "target_ages": "13-14",
        "lessons": [
            {"id": "m_g8_p01", "title": "长度和时间的测量", "content": "刻度尺和秒表的使用", "type": "lesson", "duration_min": 40},
            {"id": "m_g8_p02", "title": "运动的描述", "content": "参照物、速度的计算", "type": "lesson", "duration_min": 40},
            {"id": "m_g8_p03", "title": "声音的产生与传播", "content": "声源、介质、声速", "type": "lesson", "duration_min": 40},
            {"id": "m_g8_p04", "title": "声音的特性", "content": "音调、响度、音色", "type": "lesson", "duration_min": 40},
            {"id": "m_g8_p05", "title": "光的直线传播", "content": "光源、光线、影子日食月食", "type": "lesson", "duration_min": 40},
            {"id": "m_g8_p06", "title": "光的反射", "content": "反射定律、镜面反射和漫反射", "type": "lesson", "duration_min": 40},
            {"id": "m_g8_p07", "title": "平面镜成像", "content": "平面镜成像特点和应用", "type": "lesson", "duration_min": 40},
            {"id": "m_g8_p08", "title": "光的折射", "content": "折射规律、透镜", "type": "lesson", "duration_min": 40},
        ]
    },
    "m_g9_math": {
        "course_id": "m_g9_math", "stage": "middle_school", "grade": "g9", "subject": "数学",
        "name": "初三数学", "description": "二次函数、旋转、圆、相似、概率",
        "target_ages": "14-15",
        "lessons": [
            {"id":"m_g9_m01","title":"一元二次方程","content":"配方法、公式法解一元二次方程","type":"lesson","duration_min":45},
            {"id":"m_g9_m02","title":"二次函数","content":"二次函数图像和性质","type":"lesson","duration_min":45},
            {"id":"m_g9_m03","title":"图形的旋转","content":"旋转中心和旋转角","type":"lesson","duration_min":40},
            {"id":"m_g9_m04","title":"圆的基本性质","content":"圆心角、圆周角","type":"lesson","duration_min":45},
            {"id":"m_g9_m05","title":"直线和圆的位置关系","content":"切线的判定和性质","type":"lesson","duration_min":40},
            {"id":"m_g9_m06","title":"相似三角形","content":"相似三角形的判定和性质","type":"lesson","duration_min":45},
            {"id":"m_g9_m07","title":"锐角三角函数","content":"正弦余弦正切","type":"lesson","duration_min":40},
            {"id":"m_g9_m08","title":"投影与视图","content":"三视图","type":"lesson","duration_min":35},
            {"id":"m_g9_m09","title":"概率初步","content":"列举法求概率","type":"lesson","duration_min":35},
            {"id":"m_g9_m10","title":"总复习","content":"中考综合复习","type":"review","duration_min":45},
        ]
    },
    "m_g9_chinese": {
        "course_id": "m_g9_chinese", "stage": "middle_school", "grade": "g9", "subject": "语文",
        "name": "初三语文", "description": "诗歌、小说、议论文、文言文、中考备考",
        "target_ages": "14-15",
        "lessons": [
            {"id":"m_g9_c01","title":"沁园春雪","content":"毛泽东诗词欣赏","type":"poem","duration_min":40},
            {"id":"m_g9_c02","title":"我爱这土地","content":"艾青诗歌","type":"poem","duration_min":35},
            {"id":"m_g9_c03","title":"岳阳楼记","content":"范仲淹文言文","type":"reading","duration_min":45},
            {"id":"m_g9_c04","title":"醉翁亭记","content":"欧阳修文言文","type":"reading","duration_min":40},
            {"id":"m_g9_c05","title":"湖心亭看雪","content":"张岱小品文","type":"reading","duration_min":35},
            {"id":"m_g9_c06","title":"故乡","content":"鲁迅小说","type":"reading","duration_min":45},
            {"id":"m_g9_c07","title":"我的叔叔于勒","content":"莫泊桑小说","type":"reading","duration_min":40},
            {"id":"m_g9_c08","title":"中国人失掉自信力了吗","content":"鲁迅杂文","type":"reading","duration_min":40},
            {"id":"m_g9_c09","title":"出师表","content":"诸葛亮文言文","type":"reading","duration_min":45},
            {"id":"m_g9_c10","title":"鱼我所欲也","content":"孟子文言文","type":"reading","duration_min":40},
        ]
    },
    "m_g9_english": {
        "course_id": "m_g9_english", "stage": "middle_school", "grade": "g9", "subject": "英语",
        "name": "初三英语", "description": "被动语态、定语从句、中考备考",
        "target_ages": "14-15",
        "lessons": [
            {"id":"m_g9_e01","title":"How can we become good learners","content":"学习方法和建议","type":"lesson","duration_min":40},
            {"id":"m_g9_e02","title":"I think that mooncakes are delicious","content":"宾语从句","type":"lesson","duration_min":40},
            {"id":"m_g9_e03","title":"Could you please tell me where the restrooms are","content":"宾语从句礼貌表达","type":"lesson","duration_min":35},
            {"id":"m_g9_e04","title":"被动语态","content":"一般现在时被动语态","type":"lesson","duration_min":40},
            {"id":"m_g9_e05","title":"It must belong to Carla","content":"情态动词表推测","type":"lesson","duration_min":35},
            {"id":"m_g9_e06","title":"When was it invented","content":"过去时被动语态","type":"lesson","duration_min":35},
            {"id":"m_g9_e07","title":"Teenagers should be allowed to choose their own clothes","content":"情态动词被动语态","type":"lesson","duration_min":40},
            {"id":"m_g9_e08","title":"定语从句","content":"that/which/who引导定语从句","type":"lesson","duration_min":40},
            {"id":"m_g9_e09","title":"I remember meeting all of you in Grade 7","content":"中考总复习","type":"review","duration_min":45},
            {"id":"m_g9_e10","title":"中考冲刺","content":"完形填空、阅读理解、写作技巧","type":"review","duration_min":45},
        ]
    },
    "m_g9_physics": {
        "course_id": "m_g9_physics", "stage": "middle_school", "grade": "g9", "subject": "物理",
        "name": "初三物理", "description": "电流、电压、电阻、欧姆定律、电功率",
        "target_ages": "14-15",
        "lessons": [
            {"id":"m_g9_p01","title":"电荷","content":"正负电荷和摩擦起电","type":"lesson","duration_min":40},
            {"id":"m_g9_p02","title":"电流和电路","content":"电路组成和电流方向","type":"lesson","duration_min":40},
            {"id":"m_g9_p03","title":"串联和并联","content":"电路连接方式","type":"experiment","duration_min":45},
            {"id":"m_g9_p04","title":"电压","content":"电压表使用和串并联电压规律","type":"lesson","duration_min":40},
            {"id":"m_g9_p05","title":"电阻","content":"影响电阻大小的因素","type":"lesson","duration_min":35},
            {"id":"m_g9_p06","title":"欧姆定律","content":"I=U/R及其应用","type":"lesson","duration_min":45},
            {"id":"m_g9_p07","title":"电功率","content":"P=UI和额定功率","type":"lesson","duration_min":45},
            {"id":"m_g9_p08","title":"焦耳定律","content":"电流热效应Q=I²Rt","type":"lesson","duration_min":40},
            {"id":"m_g9_p09","title":"电与磁","content":"电磁感应和电动机","type":"lesson","duration_min":40},
            {"id":"m_g9_p10","title":"能源与可持续发展","content":"能源分类和新能源","type":"lesson","duration_min":35},
        ]
    },
    "m_g9_history": {
        "course_id": "m_g9_history", "stage": "middle_school", "grade": "g9", "subject": "历史",
        "name": "初三历史", "description": "世界史（古代-现代）",
        "target_ages": "14-15",
        "lessons": [
            {"id":"m_g9_h01","title":"古代埃及","content":"金字塔和尼罗河文明","type":"lesson","duration_min":40},
            {"id":"m_g9_h02","title":"古代两河流域","content":"汉谟拉比法典","type":"lesson","duration_min":35},
            {"id":"m_g9_h03","title":"古代印度","content":"种姓制度和佛教","type":"lesson","duration_min":35},
            {"id":"m_g9_h04","title":"古代希腊","content":"雅典民主政治","type":"lesson","duration_min":40},
            {"id":"m_g9_h05","title":"古代罗马","content":"罗马共和国到帝国","type":"lesson","duration_min":40},
            {"id":"m_g9_h06","title":"中世纪城市","content":"城市自治和大学兴起","type":"lesson","duration_min":35},
            {"id":"m_g9_h07","title":"新航路的开辟","content":"哥伦布和麦哲伦","type":"lesson","duration_min":40},
            {"id":"m_g9_h08","title":"英国资产阶级革命","content":"克伦威尔和光荣革命","type":"lesson","duration_min":40},
            {"id":"m_g9_h09","title":"法国大革命","content":"巴士底狱和拿破仑","type":"lesson","duration_min":40},
            {"id":"m_g9_h10","title":"工业革命","content":"蒸汽时代和工厂制度","type":"lesson","duration_min":40},
            {"id":"m_g9_h11","title":"第一次世界大战","content":"萨拉热窝事件和凡尔赛体系","type":"lesson","duration_min":40},
            {"id":"m_g9_h12","title":"第二次世界大战","content":"世界反法西斯战争","type":"lesson","duration_min":45},
        ]
    },
    "m_g9_morality": {
        "course_id": "m_g9_morality", "stage": "middle_school", "grade": "g9", "subject": "道德与法治",
        "name": "初三道德与法治", "description": "富强中国、民主法治、文明和谐",
        "target_ages": "14-15",
        "lessons": [
            {"id":"m_g9_d01","title":"踏上强国之路","content":"改革开放和经济发展","type":"lesson","duration_min":40},
            {"id":"m_g9_d02","title":"创新驱动发展","content":"科教兴国和创新","type":"lesson","duration_min":40},
            {"id":"m_g9_d03","title":"追求民主价值","content":"社会主义民主","type":"lesson","duration_min":35},
            {"id":"m_g9_d04","title":"建设法治中国","content":"全面依法治国","type":"lesson","duration_min":40},
            {"id":"m_g9_d05","title":"守望精神家园","content":"中华文化和民族精神","type":"lesson","duration_min":35},
            {"id":"m_g9_d06","title":"共筑生命家园","content":"生态文明建设","type":"lesson","duration_min":35},
            {"id":"m_g9_d07","title":"中国人中国梦","content":"中华民族伟大复兴","type":"lesson","duration_min":40},
            {"id":"m_g9_d08","title":"世界舞台上的中国","content":"中国担当和人类命运共同体","type":"lesson","duration_min":40},
        ]
    },
    "m_g9_chemistry": {
        "course_id": "m_g9_chemistry", "stage": "middle_school", "grade": "g9", "subject": "化学",
        "name": "初三化学", "description": "物质构成、化学方程式、酸碱盐",
        "target_ages": "14-15",
        "lessons": [
            {"id": "m_g9_c01", "title": "走进化学世界", "content": "化学变化和物理变化", "type": "lesson", "duration_min": 40},
            {"id": "m_g9_c02", "title": "空气", "content": "空气成分、氧气性质", "type": "lesson", "duration_min": 40},
            {"id": "m_g9_c03", "title": "物质构成的奥秘", "content": "分子、原子、离子", "type": "lesson", "duration_min": 45},
            {"id": "m_g9_c04", "title": "化学方程式", "content": "质量守恒定律、化学方程式书写", "type": "lesson", "duration_min": 45},
            {"id": "m_g9_c05", "title": "碳和碳的氧化物", "content": "碳单质、CO和CO2", "type": "lesson", "duration_min": 40},
            {"id": "m_g9_c06", "title": "燃烧和灭火", "content": "燃烧条件、灭火原理", "type": "lesson", "duration_min": 35},
            {"id": "m_g9_c07", "title": "溶液", "content": "溶解度、溶质质量分数", "type": "lesson", "duration_min": 40},
            {"id": "m_g9_c08", "title": "酸碱盐", "content": "常见酸碱盐的性质和用途", "type": "lesson", "duration_min": 45},
        ]
    },
}
MIDDLE_SCHOOL_COURSES.update({
    "m_g7_history": {
        "course_id": "m_g7_history", "stage": "middle_school", "grade": "g7", "subject": "历史",
        "name": "初一历史", "description": "中国古代史（史前-魏晋南北朝）",
        "target_ages": "12-13",
        "lessons": [
            {"id":"m_g7_h01","title":"中国早期人类","content":"北京人、山顶洞人","type":"lesson","duration_min":40},
            {"id":"m_g7_h02","title":"原始农耕生活","content":"河姆渡和半坡居民","type":"lesson","duration_min":35},
            {"id":"m_g7_h03","title":"华夏之祖","content":"炎黄传说和禅让制","type":"lesson","duration_min":35},
            {"id":"m_g7_h04","title":"夏商周的更替","content":"最早国家——夏朝","type":"lesson","duration_min":35},
            {"id":"m_g7_h05","title":"青铜器与甲骨文","content":"商周文明的代表","type":"lesson","duration_min":35},
            {"id":"m_g7_h06","title":"春秋争霸","content":"齐桓公、晋文公等霸主","type":"lesson","duration_min":40},
            {"id":"m_g7_h07","title":"战国七雄","content":"商鞅变法和百家争鸣","type":"lesson","duration_min":40},
            {"id":"m_g7_h08","title":"秦统一中国","content":"秦始皇统一六国","type":"lesson","duration_min":40},
            {"id":"m_g7_h09","title":"西汉的强盛","content":"汉武帝大一统","type":"lesson","duration_min":35},
            {"id":"m_g7_h10","title":"丝绸之路","content":"张骞出使西域","type":"lesson","duration_min":35},
            {"id":"m_g7_h11","title":"三国鼎立","content":"官渡之战、赤壁之战","type":"lesson","duration_min":35},
            {"id":"m_g7_h12","title":"魏晋南北朝","content":"民族交融","type":"lesson","duration_min":35},
        ]
    },
    "m_g7_geography": {
        "course_id": "m_g7_geography", "stage": "middle_school", "grade": "g7", "subject": "地理",
        "name": "初一地理", "description": "地球与地图、世界地理",
        "target_ages": "12-13",
        "lessons": [
            {"id":"m_g7_g01","title":"地球的形状和大小","content":"认识地球","type":"lesson","duration_min":35},
            {"id":"m_g7_g02","title":"经纬网","content":"经纬度和定位","type":"lesson","duration_min":40},
            {"id":"m_g7_g03","title":"地球的自转和公转","content":"昼夜交替和四季","type":"lesson","duration_min":40},
            {"id":"m_g7_g04","title":"地图的阅读","content":"比例尺、方向和图例","type":"lesson","duration_min":35},
            {"id":"m_g7_g05","title":"大洲和大洋","content":"七大洲四大洋","type":"lesson","duration_min":35},
            {"id":"m_g7_g06","title":"海陆的变迁","content":"板块构造学说","type":"lesson","duration_min":35},
            {"id":"m_g7_g07","title":"亚洲概况","content":"亚洲的位置和地形","type":"lesson","duration_min":40},
            {"id":"m_g7_g08","title":"日本","content":"日本的地理特征","type":"lesson","duration_min":35},
            {"id":"m_g7_g09","title":"东南亚","content":"东南亚的自然和人文","type":"lesson","duration_min":35},
            {"id":"m_g7_g10","title":"印度","content":"印度的自然和人文","type":"lesson","duration_min":35},
            {"id":"m_g7_g11","title":"中东","content":"中东的战略地位","type":"lesson","duration_min":35},
            {"id":"m_g7_g12","title":"欧洲西部","content":"欧洲的经济和文化","type":"lesson","duration_min":35},
        ]
    },
    "m_g8_physics": {
        "course_id": "m_g8_physics", "stage": "middle_school", "grade": "g8", "subject": "物理",
        "name": "初二物理", "description": "声、光、热、力",
        "target_ages": "13-14",
        "lessons": [
            {"id":"m_g8_p01","title":"声音的产生与传播","content":"声波的产生和特性","type":"lesson","duration_min":40},
            {"id":"m_g8_p02","title":"声音的特性","content":"音调、响度和音色","type":"lesson","duration_min":35},
            {"id":"m_g8_p03","title":"光的直线传播","content":"影子、日食月食","type":"lesson","duration_min":35},
            {"id":"m_g8_p04","title":"光的反射","content":"反射定律和应用","type":"lesson","duration_min":40},
            {"id":"m_g8_p05","title":"平面镜成像","content":"成像特点和作图","type":"lesson","duration_min":35},
            {"id":"m_g8_p06","title":"光的折射","content":"折射定律","type":"lesson","duration_min":40},
            {"id":"m_g8_p07","title":"凸透镜成像","content":"成像规律和应用","type":"lesson","duration_min":45},
            {"id":"m_g8_p08","title":"温度与物态变化","content":"熔化和凝固、汽化和液化","type":"lesson","duration_min":40},
            {"id":"m_g8_p09","title":"质量和密度","content":"密度测量","type":"lesson","duration_min":40},
            {"id":"m_g8_p10","title":"牛顿第一定律","content":"惯性定律","type":"lesson","duration_min":35},
            {"id":"m_g8_p11","title":"二力平衡","content":"平衡状态分析","type":"lesson","duration_min":35},
            {"id":"m_g8_p12","title":"压强","content":"固体压强和液体压强","type":"lesson","duration_min":40},
            {"id":"m_g8_p13","title":"浮力","content":"阿基米德原理","type":"lesson","duration_min":40},
            {"id":"m_g8_p14","title":"功和机械能","content":"功的概念和能量转化","type":"lesson","duration_min":35},
        ]
    },
    "m_g9_chemistry": {
        "course_id": "m_g9_chemistry", "stage": "middle_school", "grade": "g9", "subject": "化学",
        "name": "初三化学", "description": "物质构成、化学方程式、溶液",
        "target_ages": "14-15",
        "lessons": [
            {"id":"m_g9_ch01","title":"物质的变化和性质","content":"物理变化和化学变化","type":"lesson","duration_min":40},
            {"id":"m_g9_ch02","title":"化学实验基本操作","content":"药品取用、加热、连接仪器","type":"lesson","duration_min":40},
            {"id":"m_g9_ch03","title":"空气","content":"空气组成和氧气性质","type":"lesson","duration_min":35},
            {"id":"m_g9_ch04","title":"氧气","content":"氧气的实验室制法","type":"lesson","duration_min":40},
            {"id":"m_g9_ch05","title":"分子和原子","content":"物质构成的微粒","type":"lesson","duration_min":35},
            {"id":"m_g9_ch06","title":"元素","content":"元素符号和元素周期表","type":"lesson","duration_min":40},
            {"id":"m_g9_ch07","title":"化学方程式","content":"质量守恒定律和配平","type":"lesson","duration_min":45},
            {"id":"m_g9_ch08","title":"碳和碳的氧化物","content":"CO₂的实验室制法","type":"lesson","duration_min":40},
            {"id":"m_g9_ch09","title":"溶液","content":"溶解度曲线","type":"lesson","duration_min":40},
            {"id":"m_g9_ch10","title":"酸和碱","content":"酸碱指示剂和pH","type":"lesson","duration_min":40},
            {"id":"m_g9_ch11","title":"盐和化肥","content":"常见复分解反应","type":"lesson","duration_min":35},
            {"id":"m_g9_ch12","title":"化学与生活","content":"生活中的化学","type":"lesson","duration_min":35},
        ]
    },
})

# ==================== 测验题库 ====================
QUIZ_DATABASE = {
    # 幼儿园测验
    "k_math": {"stage": "kindergarten", "name": "数学启蒙", "questions": [
        {"q": "1+1等于几？", "options": ["1", "2", "3", "4"], "answer": "1", "difficulty": "easy"},
        {"q": "哪个是圆形？", "options": ["⚪", "⬜", "△", "⬟"], "answer": "0", "difficulty": "easy"},
        {"q": "3后面是几？", "options": ["2", "4", "5", "1"], "answer": "1", "difficulty": "easy"},
        {"q": "哪个数字最大？", "options": ["2", "5", "8", "3"], "answer": "2", "difficulty": "easy"},
        {"q": "2+3等于几？", "options": ["4", "5", "6", "7"], "answer": "1", "difficulty": "medium"},
        {"q": "5-2等于几？", "options": ["2", "3", "4", "1"], "answer": "1", "difficulty": "medium"},
        {"q": "正方体有几个面？", "options": ["4", "6", "8", "3"], "answer": "1", "difficulty": "medium"},
        {"q": "一周有几天？", "options": ["5", "6", "7", "8"], "answer": "2", "difficulty": "medium"},
        {"q": "10个苹果，吃了3个，还剩几个？", "options": ["5", "6", "7", "8"], "answer": "2", "difficulty": "hard"},
        {"q": "哪个是三角形？", "options": ["⚪", "⬜", "△", "⬟"], "answer": "2", "difficulty": "easy"},
    ]},
    "k_language": {"stage": "kindergarten", "name": "语言发展", "questions": [
        {"q": "我们的首都是哪里？", "options": ["上海", "北京", "广州", "深圳"], "answer": "1", "difficulty": "easy"},
        {"q": "国旗是什么颜色？", "options": ["红色", "蓝色", "绿色", "黄色"], "answer": "0", "difficulty": "easy"},
        {"q": "\"谢谢\"用英语怎么说？", "options": ["Hello", "Thank you", "Goodbye", "Sorry"], "answer": "1", "difficulty": "medium"},
        {"q": "哪个是水果？", "options": ["桌子", "椅子", "苹果", "铅笔"], "answer": "2", "difficulty": "easy"},
        {"q": "一年有几个季节？", "options": ["2", "3", "4", "5"], "answer": "2", "difficulty": "medium"},
        {"q": "早上好用英语怎么说？", "options": ["Good night", "Good morning", "Good afternoon", "Goodbye"], "answer": "1", "difficulty": "easy"},
        {"q": "猫的英文是什么？", "options": ["Dog", "Cat", "Bird", "Fish"], "answer": "1", "difficulty": "easy"},
        {"q": "下面哪个是礼貌用语？", "options": ["走开", "谢谢", "我要", "不行"], "answer": "1", "difficulty": "easy"},
    ]},
    "k_science": {"stage": "kindergarten", "name": "科学探索", "questions": [
        {"q": "太阳从哪边升起？", "options": ["西边", "东边", "南边", "北边"], "answer": "1", "difficulty": "easy"},
        {"q": "水加热会变成什么？", "options": ["冰", "水蒸气", "雪", "雾"], "answer": "1", "difficulty": "medium"},
        {"q": "熊猫喜欢吃什么？", "options": ["肉", "竹子", "鱼", "水果"], "answer": "1", "difficulty": "easy"},
        {"q": "哪个动物会飞？", "options": ["鱼", "狗", "鸟", "猫"], "answer": "2", "difficulty": "easy"},
        {"q": "彩虹有几种颜色？", "options": ["5", "6", "7", "8"], "answer": "2", "difficulty": "medium"},
        {"q": "植物生长需要什么？", "options": ["阳光和水", "只有水", "只有土", "只有阳光"], "answer": "0", "difficulty": "medium"},
    ]},
    # 小学测验
    "p_g1_math_q": {"stage": "primary", "grade": "g1", "subject": "数学", "name": "一年级数学", "questions": [
        {"q": "5+3等于几？", "options": ["7", "8", "9", "6"], "answer": "1", "difficulty": "easy"},
        {"q": "10-4等于几？", "options": ["5", "6", "7", "4"], "answer": "1", "difficulty": "easy"},
        {"q": "比7大比9小的数是？", "options": ["6", "8", "10", "5"], "answer": "1", "difficulty": "easy"},
        {"q": "下面哪个是圆柱？", "options": ["篮球", "易拉罐", "魔方", "乒乓球"], "answer": "1", "difficulty": "easy"},
        {"q": "8+7等于几？", "options": ["14", "15", "16", "13"], "answer": "1", "difficulty": "medium"},
        {"q": "15-9等于几？", "options": ["5", "6", "7", "8"], "answer": "1", "difficulty": "medium"},
        {"q": "钟表上分针指向12，时针指向3，是几点？", "options": ["2点", "3点", "4点", "5点"], "answer": "1", "difficulty": "medium"},
        {"q": "小明有8个苹果，吃了3个，又买了2个，现在有几个？", "options": ["5", "6", "7", "8"], "answer": "2", "difficulty": "hard"},
    ]},
    "p_g3_math_q": {"stage": "primary", "grade": "g3", "subject": "数学", "name": "三年级数学", "questions": [
        {"q": "234+567等于几？", "options": ["791", "801", "811", "781"], "answer": "1", "difficulty": "easy"},
        {"q": "8×7等于几？", "options": ["48", "56", "64", "72"], "answer": "1", "difficulty": "easy"},
        {"q": "1分米等于多少厘米？", "options": ["5", "10", "100", "1000"], "answer": "1", "difficulty": "easy"},
        {"q": "长方形长5cm宽3cm，周长是多少？", "options": ["15cm", "16cm", "8cm", "30cm"], "answer": "1", "difficulty": "medium"},
        {"q": "1/4 + 1/4等于多少？", "options": ["1/8", "1/2", "2/4", "1/4"], "answer": "1", "difficulty": "medium"},
        {"q": "0.5+0.3等于几？", "options": ["0.8", "0.08", "8.0", "0.53"], "answer": "0", "difficulty": "medium"},
        {"q": "一列火车5小时行驶450公里，每小时行驶多少公里？", "options": ["80", "90", "100", "110"], "answer": "1", "difficulty": "hard"},
    ]},
    "p_g5_math_q": {"stage": "primary", "grade": "g5", "subject": "数学", "name": "五年级数学", "questions": [
        {"q": "2.5×4等于几？", "options": ["8", "10", "12", "6"], "answer": "1", "difficulty": "easy"},
        {"q": "解方程2x+3=11，x等于？", "options": ["3", "4", "5", "6"], "answer": "1", "difficulty": "easy"},
        {"q": "三角形面积公式是？", "options": ["底×高", "底×高÷2", "2×底×高", "底+高"], "answer": "1", "difficulty": "easy"},
        {"q": "3.6÷0.6等于几？", "options": ["0.6", "6", "60", "0.06"], "answer": "1", "difficulty": "medium"},
        {"q": "平行四边形底8cm高5cm，面积多少？", "options": ["20cm²", "40cm²", "13cm²", "26cm²"], "answer": "1", "difficulty": "medium"},
        {"q": "学校在路的一边每隔10米栽一棵树，共栽了11棵，路长多少米？", "options": ["100m", "110m", "120m", "90m"], "answer": "0", "difficulty": "hard"},
    ]},
    "p_g3_english_q": {"stage": "primary", "grade": "g3", "subject": "英语", "name": "三年级英语", "questions": [
        {"q": "What color is the sky?", "options": ["Red", "Blue", "Green", "Yellow"], "answer": "1", "difficulty": "easy"},
        {"q": "How many legs does a cat have?", "options": ["2", "3", "4", "5"], "answer": "2", "difficulty": "easy"},
        {"q": "I ___ a student.", "options": ["is", "am", "are", "be"], "answer": "1", "difficulty": "medium"},
        {"q": "What's this? ___ a book.", "options": ["Its", "It's", "Its'", "It is"], "answer": "1", "difficulty": "medium"},
        {"q": "___ you like apples?", "options": ["Does", "Do", "Is", "Are"], "answer": "1", "difficulty": "medium"},
        {"q": "She ___ to school every day.", "options": ["go", "goes", "going", "went"], "answer": "1", "difficulty": "hard"},
    ]},
    "p_g1_chinese_q": {"stage": "primary", "grade": "g1", "subject": "语文", "name": "一年级语文", "questions": [
        {"q":"'天'字有几画？","options":["3画","4画","5画","6画"],"answer":1,"difficulty":"easy"},
        {"q":"下面哪个是韵母？","options":["b","p","a","d"],"answer":2,"difficulty":"easy"},
        {"q":"'大'的反义词是什么？","options":["多","小","长","高"],"answer":1,"difficulty":"easy"},
        {"q":"'日'加一笔变成什么字？","options":["目","田","旦","旧"],"answer":0,"difficulty":"medium"},
        {"q":"《咏鹅》的作者是谁？","options":["李白","骆宾王","杜甫","白居易"],"answer":1,"difficulty":"medium"},
        {"q":"'木头'这个词有几个字？","options":["1","2","3","4"],"answer":1,"difficulty":"easy"},
        {"q":"下面哪个是整体认读音节？","options":["ba","zhi","mi","gu"],"answer":1,"difficulty":"medium"},
        {"q":"'上'字的笔顺第一笔是什么？","options":["横","竖","撇","点"],"answer":0,"difficulty":"hard"},
    ]},
    "p_g2_math_q": {"stage": "primary", "grade": "g2", "subject": "数学", "name": "二年级数学", "questions": [
        {"q":"3×4等于几？","options":["7","12","21","34"],"answer":1,"difficulty":"easy"},
        {"q":"18÷3等于几？","options":["3","6","9","15"],"answer":1,"difficulty":"easy"},
        {"q":"1米等于多少厘米？","options":["10","100","1000","10000"],"answer":1,"difficulty":"easy"},
        {"q":"三角板上有几个角？","options":["2","3","4","5"],"answer":1,"difficulty":"easy"},
        {"q":"56+37等于几？","options":["83","93","103","73"],"answer":1,"difficulty":"medium"},
        {"q":"正方形有几条对称轴？","options":["2","4","6","8"],"answer":1,"difficulty":"medium"},
        {"q":"小明有24颗糖，平均分给6个小朋友，每人几颗？","options":["3","4","5","6"],"answer":1,"difficulty":"medium"},
        {"q":"一箱苹果有36个，每天吃4个，几天吃完？","options":["6","7","8","9"],"answer":2,"difficulty":"hard"},
    ]},
    "p_g2_chinese_q": {"stage": "primary", "grade": "g2", "subject": "语文", "name": "二年级语文", "questions": [
        {"q":"'杨'字的部首是什么？","options":["木","扌","日","月"],"answer":0,"difficulty":"easy"},
        {"q":"《望庐山瀑布》的作者是？","options":["杜甫","李白","白居易","王维"],"answer":1,"difficulty":"easy"},
        {"q":"'高兴'的反义词是？","options":["快乐","难过","开心","愉快"],"answer":1,"difficulty":"easy"},
        {"q":"'坐井观天'告诉我们什么道理？","options":["要谦虚","要勇敢","要看全面","要勤劳"],"answer":2,"difficulty":"medium"},
        {"q":"下面哪个是形声字？","options":["日","月","河","山"],"answer":2,"difficulty":"medium"},
        {"q":"'狐假虎威'中狐狸利用了什么？","options":["老虎的威风","自己的聪明","狮子的力量","大象的体型"],"answer":0,"difficulty":"medium"},
        {"q":"'己'和'已'有什么区别？","options":["笔画不同","读音相同","意思相同","没有区别"],"answer":0,"difficulty":"hard"},
    ]},
    "p_g4_math_q": {"stage": "primary", "grade": "g4", "subject": "数学", "name": "四年级数学", "questions": [
        {"q":"125×8等于几？","options":["100","1000","960","1250"],"answer":1,"difficulty":"easy"},
        {"q":"1平方千米等于多少公顷？","options":["10","100","1000","10000"],"answer":1,"difficulty":"easy"},
        {"q":"平行四边形有几条高？","options":["1","2","无数条","4"],"answer":2,"difficulty":"medium"},
        {"q":"在除法算式□÷7=12……5中，□是多少？","options":["84","89","79","95"],"answer":1,"difficulty":"medium"},
        {"q":"一个周角等于几个平角？","options":["1","2","3","4"],"answer":1,"difficulty":"easy"},
        {"q":"一道除法算式商是15，余数是8，除数最小是几？","options":["7","8","9","10"],"answer":2,"difficulty":"hard"},
        {"q":"甲乙两地相距480公里，汽车6小时到达，速度是多少？","options":["60km/h","70km/h","80km/h","90km/h"],"answer":2,"difficulty":"medium"},
    ]},
    "p_g4_english_q": {"stage": "primary", "grade": "g4", "subject": "英语", "name": "四年级英语", "questions": [
        {"q":"What color is the banana?","options":["Red","Yellow","Blue","Green"],"answer":1,"difficulty":"easy"},
        {"q":"How many students are there? ___ 40.","options":["Its","There are","They are","It is"],"answer":1,"difficulty":"medium"},
        {"q":"Where ___ the cat? It's under the chair.","options":["am","is","are","be"],"answer":1,"difficulty":"easy"},
        {"q":"What time is it? It's ___ o'clock.","options":["three","third","thirth","threeth"],"answer":0,"difficulty":"medium"},
        {"q":"My mother is a ___. She works in a hospital.","options":["teacher","doctor","driver","farmer"],"answer":1,"difficulty":"easy"},
        {"q":"I ___ a new schoolbag.","options":["has","have","am","is"],"answer":1,"difficulty":"easy"},
    ]},
    "p_g6_math_q": {"stage": "primary", "grade": "g6", "subject": "数学", "name": "六年级数学", "questions": [
        {"q":"1/2+1/3等于几？","options":["2/5","5/6","1/6","2/6"],"answer":1,"difficulty":"easy"},
        {"q":"圆的周长公式是？","options":["C=πr","C=2πr","C=πr²","C=2r"],"answer":1,"difficulty":"easy"},
        {"q":"0.25等于几分之几？","options":["1/2","1/4","2/5","3/4"],"answer":1,"difficulty":"easy"},
        {"q":"一个数减少20%后是80，这个数原来是？","options":["96","100","64","120"],"answer":1,"difficulty":"medium"},
        {"q":"从甲地到乙地，客车要4小时，货车要6小时，客车和货车的速度比是？","options":["2:3","3:2","4:6","6:4"],"answer":1,"difficulty":"medium"},
        {"q":"在一个比例中，两个内项互为倒数，一个外项是2.5，另一个外项是？","options":["0.4","2.5","1","0.25"],"answer":0,"difficulty":"hard"},
        {"q":"圆柱的体积公式是？","options":["V=πr²h","V=πrh","V=2πrh","V=πr²"],"answer":0,"difficulty":"medium"},
    ]},
    "p_g6_english_q": {"stage": "primary", "grade": "g6", "subject": "英语", "name": "六年级英语", "questions": [
        {"q":"I ___ to the park yesterday.","options":["go","went","goes","going"],"answer":1,"difficulty":"easy"},
        {"q":"Which is the comparative of 'good'?","options":["gooder","better","bester","more good"],"answer":1,"difficulty":"medium"},
        {"q":"What are you going to do? I'm going to ___ a book.","options":["read","reads","reading","readed"],"answer":0,"difficulty":"easy"},
        {"q":"He ___ a teacher.","options":["am","is","are","be"],"answer":1,"difficulty":"easy"},
        {"q":"Where ___ you go last weekend?","options":["do","does","did","are"],"answer":2,"difficulty":"medium"},
        {"q":"Tom is ___ than Jerry.","options":["tall","taller","tallest","more tall"],"answer":1,"difficulty":"easy"},
    ]},
    # 中学测验
    "m_g7_math_q": {"stage": "middle_school", "grade": "g7", "subject": "数学", "name": "初一数学", "questions": [
        {"q": "(-5)+(-3)等于几？", "options": ["2", "-2", "8", "-8"], "answer": "3", "difficulty": "easy"},
        {"q": "(-3)×(-4)等于几？", "options": ["-12", "12", "7", "-7"], "answer": "1", "difficulty": "easy"},
        {"q": "同类项合并：3a+2b-a+3b等于？", "options": ["2a+5b", "4a+5b", "2a-b", "4a-b"], "answer": "0", "difficulty": "medium"},
        {"q": "解方程 2x-5=13", "options": ["x=4", "x=9", "x=-4", "x=-9"], "answer": "1", "difficulty": "easy"},
        {"q": "一个数的相反数是它本身，这个数是？", "options": ["1", "-1", "0", "不存在"], "answer": "2", "difficulty": "medium"},
        {"q": "| -8 | 等于多少？", "options": ["-8", "8", "0", "±8"], "answer": "1", "difficulty": "easy"},
        {"q": "解方程 3(x-2)=2x+4", "options": ["x=10", "x=-10", "x=2", "x=-2"], "answer": "0", "difficulty": "hard"},
    ]},
    "m_g8_physics_q": {"stage": "middle_school", "grade": "g8", "subject": "物理", "name": "初二物理", "questions": [
        {"q": "声音在什么介质中传播最快？", "options": ["空气", "水", "铁", "真空"], "answer": "2", "difficulty": "easy"},
        {"q": "光在真空中的速度约为？", "options": ["3×10⁶m/s", "3×10⁸m/s", "3×10¹⁰m/s", "340m/s"], "answer": "1", "difficulty": "easy"},
        {"q": "平面镜成像的特点是？", "options": ["倒立等大", "正立等大", "正立放大", "倒立缩小"], "answer": "1", "difficulty": "medium"},
        {"q": "将钢尺伸出桌面不同长度，拨动时音调变化说明？", "options": ["音调与振幅有关", "音调与频率有关", "响度与振幅有关", "音色与材料有关"], "answer": "1", "difficulty": "medium"},
        {"q": "入射角30度，反射角为？", "options": ["15°", "30°", "60°", "90°"], "answer": "1", "difficulty": "easy"},
        {"q": "汽车速度36km/h等于多少m/s？", "options": ["10m/s", "20m/s", "36m/s", "100m/s"], "answer": "0", "difficulty": "hard"},
    ]},
    "m_g9_chem_q": {"stage": "middle_school", "grade": "g9", "subject": "化学", "name": "初三化学", "questions": [
        {"q": "水的化学式是？", "options": ["H₂", "O₂", "H₂O", "CO₂"], "answer": "2", "difficulty": "easy"},
        {"q": "空气中含量最多的气体是？", "options": ["氧气", "氮气", "二氧化碳", "稀有气体"], "answer": "1", "difficulty": "easy"},
        {"q": "下列属于化学变化的是？", "options": ["玻璃破碎", "铁生锈", "衣服晾干", "水结冰"], "answer": "1", "difficulty": "easy"},
        {"q": "pH=7的溶液呈什么性？", "options": ["酸性", "碱性", "中性", "不确定"], "answer": "2", "difficulty": "medium"},
        {"q": "二氧化碳能使什么变浑浊？", "options": ["食盐水", "石灰水", "糖水", "肥皂水"], "answer": "1", "difficulty": "medium"},
        {"q": "相对原子质量单位是？", "options": ["克", "千克", "没有单位", "毫克"], "answer": "2", "difficulty": "hard"},
    ]},
    "m_g7_history_q": {"stage": "middle_school", "grade": "g7", "subject": "历史", "name": "初一历史", "questions": [
        {"q": "中国最早的人类是？", "options": ["北京人", "元谋人", "山顶洞人", "蓝田人"], "answer": "1", "difficulty": "easy"},
        {"q": "中国历史上第一个王朝是？", "options": ["商朝", "周朝", "夏朝", "秦朝"], "answer": "2", "difficulty": "easy"},
        {"q": "秦始皇统一中国是在哪一年？", "options": ["公元前230年", "公元前221年", "公元前210年", "公元前206年"], "answer": "1", "difficulty": "medium"},
        {"q": "丝绸之路的开辟者是？", "options": ["班超", "张骞", "玄奘", "郑和"], "answer": "1", "difficulty": "easy"},
        {"q": "春秋五霸中最先称霸的是？", "options": ["晋文公", "齐桓公", "楚庄王", "秦穆公"], "answer": "1", "difficulty": "medium"},
        {"q": "甲骨文主要发现于哪个遗址？", "options": ["殷墟", "三星堆", "兵马俑", "马王堆"], "answer": "0", "difficulty": "medium"},
    ]},
    "m_g7_chinese_q": {"stage": "middle_school", "grade": "g7", "subject": "语文", "name": "初一语文", "questions": [
        {"q":"《春》的作者是谁？","options":["老舍","朱自清","鲁迅","巴金"],"answer":1,"difficulty":"easy"},
        {"q":"'温故而知新'出自哪里？","options":["《孟子》","《论语》","《大学》","《中庸》"],"answer":1,"difficulty":"easy"},
        {"q":"'学而不思则罔'的下一句是？","options":["思而不学则殆","思而不学则惘","学而不思则盲","思而不学则慌"],"answer":0,"difficulty":"medium"},
        {"q":"《观沧海》的作者是？","options":["李白","杜甫","曹操","白居易"],"answer":2,"difficulty":"easy"},
        {"q":"'撒盐空中差可拟'描写的是什么？","options":["雨","雪","风","云"],"answer":1,"difficulty":"medium"},
        {"q":"《世说新语》是谁编纂的？","options":["刘义庆","司马迁","班固","司马光"],"answer":0,"difficulty":"medium"},
        {"q":"'静以修身，俭以养德'出自？","options":["《诫子书》","《出师表》","《陈情表》","《兰亭集序》"],"answer":0,"difficulty":"hard"},
    ]},
    "m_g7_english_q": {"stage": "middle_school", "grade": "g7", "subject": "英语", "name": "初一英语", "questions": [
        {"q":"She ___ a student.","options":["am","is","are","be"],"answer":1,"difficulty":"easy"},
        {"q":"I have ___ apple.","options":["a","an","the","some"],"answer":1,"difficulty":"easy"},
        {"q":"They ___ playing football now.","options":["is","am","are","be"],"answer":2,"difficulty":"easy"},
        {"q":"He usually ___ to school by bus.","options":["go","goes","going","went"],"answer":1,"difficulty":"medium"},
        {"q":"There ___ a book and two pens on the desk.","options":["is","are","am","be"],"answer":0,"difficulty":"medium"},
        {"q":"What time does she get up? She ___ up at 6:30.","options":["get","gets","getting","got"],"answer":1,"difficulty":"medium"},
        {"q":"I'd like ___ noodles.","options":["eat","eating","to eat","ate"],"answer":2,"difficulty":"hard"},
    ]},
    "m_g7_geography_q": {"stage": "middle_school", "grade": "g7", "subject": "地理", "name": "初一地理", "questions": [
        {"q":"地球的最大周长约是多少？","options":["4万公里","5万公里","6万公里","3万公里"],"answer":0,"difficulty":"easy"},
        {"q":"世界最大的大洋是？","options":["大西洋","太平洋","印度洋","北冰洋"],"answer":1,"difficulty":"easy"},
        {"q":"七大洲中面积最大的是？","options":["非洲","北美洲","亚洲","南美洲"],"answer":2,"difficulty":"easy"},
        {"q":"赤道穿过的大洲有？","options":["亚洲、欧洲","非洲、南美洲","北美洲、南极洲","大洋洲、欧洲"],"answer":1,"difficulty":"medium"},
        {"q":"板块构造学说认为全球分为几大板块？","options":["4","5","6","7"],"answer":2,"difficulty":"medium"},
        {"q":"世界人口最多的国家是？","options":["美国","中国","印度","印度尼西亚"],"answer":2,"difficulty":"easy"},
        {"q":"等高线密集表示什么？","options":["坡度陡","坡度缓","海拔高","海拔低"],"answer":0,"difficulty":"medium"},
    ]},
    "m_g8_math_q": {"stage": "middle_school", "grade": "g8", "subject": "数学", "name": "初二数学", "questions": [
        {"q":"三角形内角和等于？","options":["90°","180°","270°","360°"],"answer":1,"difficulty":"easy"},
        {"q":"勾股定理中，直角边为3和4，斜边为？","options":["5","6","7","8"],"answer":0,"difficulty":"easy"},
        {"q":"点(3,2)关于x轴的对称点是？","options":["(-3,2)","(3,-2)","(-3,-2)","(2,3)"],"answer":1,"difficulty":"medium"},
        {"q":"因式分解：x²-9=？","options":["(x+3)(x-3)","(x+3)²","(x-3)²","(x+9)(x-9)"],"answer":0,"difficulty":"medium"},
        {"q":"平行四边形的对角线有什么性质？","options":["相等","互相平分","互相垂直","平分对角"],"answer":1,"difficulty":"medium"},
        {"q":"一次函数y=2x+1的图像不经过哪个象限？","options":["第一","第二","第三","第四"],"answer":3,"difficulty":"hard"},
        {"q":"√16等于几？","options":["±4","4","-4","8"],"answer":1,"difficulty":"easy"},
    ]},
    "m_g8_english_q": {"stage": "middle_school", "grade": "g8", "subject": "英语", "name": "初二英语", "questions": [
        {"q":"He is ___ than his brother.","options":["tall","taller","tallest","more tall"],"answer":1,"difficulty":"easy"},
        {"q":"Have you ever ___ to Beijing?","options":["been","gone","went","go"],"answer":0,"difficulty":"easy"},
        {"q":"She ___ to the park yesterday.","options":["go","goes","went","going"],"answer":2,"difficulty":"easy"},
        {"q":"This is the ___ movie I've ever seen.","options":["good","better","best","well"],"answer":2,"difficulty":"medium"},
        {"q":"What ___ you do if you had a million dollars?","options":["will","would","do","did"],"answer":1,"difficulty":"hard"},
        {"q":"The book ___ by Mo Yan.","options":["wrote","was written","is writing","has written"],"answer":1,"difficulty":"medium"},
        {"q":"I don't know ___ he will come or not.","options":["if","whether","that","what"],"answer":1,"difficulty":"hard"},
    ]},
    "m_g8_biology_q": {"stage": "middle_school", "grade": "g8", "subject": "生物", "name": "初二生物", "questions": [
        {"q":"人体运动系统的组成包括？","options":["骨、关节、骨骼肌","骨、骨骼、肌肉","骨头、韧带","关节、韧带"],"answer":0,"difficulty":"easy"},
        {"q":"细菌的繁殖方式是？","options":["出芽","分裂","孢子","种子"],"answer":1,"difficulty":"easy"},
        {"q":"遗传物质的基本单位是？","options":["染色体","DNA","基因","细胞核"],"answer":2,"difficulty":"medium"},
        {"q":"鸟类的生殖方式是？","options":["胎生","卵生","卵胎生","无性生殖"],"answer":1,"difficulty":"easy"},
        {"q":"最大的生物分类单位是？","options":["界","门","纲","目"],"answer":0,"difficulty":"easy"},
        {"q":"人体最大的细胞是？","options":["卵细胞","精子","红细胞","白细胞"],"answer":0,"difficulty":"medium"},
        {"q":"孟德尔遗传实验中，高茎和矮茎豌豆杂交F1代全部表现为？","options":["高茎","矮茎","中间型","部分高茎"],"answer":0,"difficulty":"medium"},
    ]},
    "m_g9_math_q": {"stage": "middle_school", "grade": "g9", "subject": "数学", "name": "初三数学", "questions": [
        {"q":"二次函数y=x²-2x+1的顶点坐标是？","options":["(1,0)","(-1,0)","(0,1)","(2,1)"],"answer":0,"difficulty":"medium"},
        {"q":"圆的面积公式是？","options":["S=πr","S=πr²","S=2πr","S=πd"],"answer":1,"difficulty":"easy"},
        {"q":"一元二次方程x²-4=0的解是？","options":["x=±2","x=2","x=-2","x=±4"],"answer":0,"difficulty":"easy"},
        {"q":"sin30°等于多少？","options":["0","1/2","√2/2","√3/2"],"answer":1,"difficulty":"easy"},
        {"q":"两个相似三角形的面积比是4:9，则对应边比是？","options":["2:3","4:9","16:81","2:9"],"answer":0,"difficulty":"medium"},
        {"q":"从1到9中随机抽一个数，抽到奇数的概率是？","options":["4/9","5/9","1/2","2/3"],"answer":1,"difficulty":"medium"},
        {"q":"圆的切线垂直于？","options":["半径","直径","弦","弧"],"answer":0,"difficulty":"easy"},
    ]},
    "m_g9_english_q": {"stage": "middle_school", "grade": "g9", "subject": "英语", "name": "初三英语", "questions": [
        {"q":"The cloth ___ soft.","options":["feels","is felt","feeling","felt"],"answer":0,"difficulty":"medium"},
        {"q":"I don't know ___ he is.","options":["who","whom","whose","which"],"answer":0,"difficulty":"easy"},
        {"q":"The building ___ in 2000.","options":["built","was built","is built","builds"],"answer":1,"difficulty":"easy"},
        {"q":"She is the girl ___ won the first prize.","options":["which","who","whom","whose"],"answer":1,"difficulty":"medium"},
        {"q":"If I ___ you, I would study harder.","options":["am","was","were","be"],"answer":2,"difficulty":"hard"},
        {"q":"He ___ have missed the bus.","options":["must","should","can","would"],"answer":0,"difficulty":"medium"},
        {"q":"Could you tell me ___?","options":["where is the station","where the station is","the station is where","where the station"],"answer":1,"difficulty":"hard"},
    ]},
    "m_g9_history_q": {"stage": "middle_school", "grade": "g9", "subject": "历史", "name": "初三历史", "questions": [
        {"q":"古埃及文明的象征是？","options":["长城","金字塔","泰姬陵","竞技场"],"answer":1,"difficulty":"easy"},
        {"q":"《汉谟拉比法典》出自哪个文明？","options":["古代埃及","古代两河流域","古代印度","古代希腊"],"answer":1,"difficulty":"easy"},
        {"q":"雅典民主政治的黄金时代在谁执政时期？","options":["梭伦","伯里克利","克利斯提尼","亚历山大"],"answer":1,"difficulty":"medium"},
        {"q":"发现美洲新大陆的航海家是？","options":["达伽马","哥伦布","麦哲伦","迪亚士"],"answer":1,"difficulty":"easy"},
        {"q":"法国大革命爆发的标志是？","options":["三级会议召开","攻占巴士底狱","《人权宣言》","处死路易十六"],"answer":1,"difficulty":"medium"},
        {"q":"工业革命首先发生在哪个国家？","options":["法国","美国","德国","英国"],"answer":3,"difficulty":"easy"},
        {"q":"第一次世界大战的导火索是？","options":["三国同盟","萨拉热窝事件","马恩河战役","凡尔登战役"],"answer":1,"difficulty":"easy"},
    ]},
    "m_g9_physics_q": {"stage": "middle_school", "grade": "g9", "subject": "物理", "name": "初三物理", "questions": [
        {"q":"电流的单位是？","options":["伏特","安培","欧姆","瓦特"],"answer":1,"difficulty":"easy"},
        {"q":"欧姆定律的公式是？","options":["I=UR","I=U/R","I=R/U","U=IR²"],"answer":1,"difficulty":"easy"},
        {"q":"家庭电路的电压是？","options":["36V","110V","220V","380V"],"answer":2,"difficulty":"easy"},
        {"q":"电能表测量的是？","options":["电流","电压","电功","电功率"],"answer":2,"difficulty":"medium"},
        {"q":"电阻串联后总电阻会？","options":["变大","变小","不变","不确定"],"answer":0,"difficulty":"easy"},
        {"q":"焦耳定律的公式Q=I²Rt中，t表示？","options":["温度","时间","长度","面积"],"answer":1,"difficulty":"medium"},
        {"q":"电磁感应现象是谁发现的？","options":["牛顿","法拉第","奥斯特","焦耳"],"answer":1,"difficulty":"medium"},
        {"q":"一度电（1kWh）等于多少焦耳？","options":["3.6×10³","3.6×10⁶","3.6×10⁹","3.6×10⁵"],"answer":1,"difficulty":"hard"},
    ]},
}
QUIZ_DATABASE.update({
    "m_g7_history_q": {"stage": "middle_school", "grade": "g7", "subject": "历史", "name": "初一历史", "questions": [
        {"q":"北京人生活的时代距今约？","options":["70万-20万年","170万年","3万年","1万年"],"answer":0,"difficulty":"easy"},
        {"q":"河姆渡居民种植的农作物是？","options":["水稻","粟","小麦","玉米"],"answer":0,"difficulty":"easy"},
        {"q":"中国历史上第一个王朝是？","options":["夏","商","周","秦"],"answer":0,"difficulty":"easy"},
        {"q":"甲骨文主要发现于哪个遗址？","options":["殷墟","二里头","周原","三星堆"],"answer":0,"difficulty":"easy"},
        {"q":"春秋时期的第一个霸主是？","options":["齐桓公","晋文公","楚庄王","秦穆公"],"answer":0,"difficulty":"medium"},
        {"q":"商鞅变法发生在哪个国家？","options":["秦国","楚国","魏国","赵国"],"answer":0,"difficulty":"easy"},
        {"q":"秦始皇推行的地方行政制度是？","options":["分封制","郡县制","行省制","三公九卿制"],"answer":1,"difficulty":"medium"},
        {"q":"汉武帝时期占据河西走廊的张骞出使西域的目的是？","options":["通商","联合大月氏","传播文化","探险"],"answer":1,"difficulty":"hard"},
        {"q":"赤壁之战的交战双方是？","options":["曹操vs孙权刘备","曹操vs袁绍","刘备vs孙权","曹丕vs刘备"],"answer":0,"difficulty":"easy"},
        {"q":"北魏孝文帝改革的核心是？","options":["汉化","鲜卑化","佛教化","军事改革"],"answer":0,"difficulty":"medium"},
    ]},
    "m_g7_geography_q": {"stage": "middle_school", "grade": "g7", "subject": "地理", "name": "初一地理", "questions": [
        {"q":"地球的平均半径约为？","options":["6371km","40000km","12742km","5100km"],"answer":0,"difficulty":"easy"},
        {"q":"0°经线又被称为？","options":["本初子午线","赤道","回归线","极圈"],"answer":0,"difficulty":"easy"},
        {"q":"七大洲中面积最大的是？","options":["亚洲","非洲","北美洲","南美洲"],"answer":0,"difficulty":"easy"},
        {"q":"四大洋中面积最小的是？","options":["北冰洋","印度洋","大西洋","太平洋"],"answer":0,"difficulty":"easy"},
        {"q":"世界上最大的半岛是？","options":["阿拉伯半岛","印度半岛","中南半岛","斯堪的纳维亚半岛"],"answer":0,"difficulty":"medium"},
        {"q":"日本多火山地震的原因？","options":["位于板块交界处","位于板块内部","位于赤道","位于寒带"],"answer":0,"difficulty":"easy"},
        {"q":"马六甲海峡沟通的海洋是？","options":["太平洋和印度洋","太平洋和大西洋","印度洋和大西洋","北冰洋和太平洋"],"answer":0,"difficulty":"medium"},
        {"q":"中东地区最丰富的资源是？","options":["石油","淡水","煤炭","森林"],"answer":0,"difficulty":"easy"},
        {"q":"被称为世界屋脊的是？","options":["青藏高原","巴西高原","东非高原","蒙古高原"],"answer":0,"difficulty":"easy"},
        {"q":"欧洲西部最主要的气候类型是？","options":["温带海洋性气候","地中海气候","温带大陆性气候","寒带气候"],"answer":0,"difficulty":"medium"},
    ]},
    "m_g8_physics_q": {"stage": "middle_school", "grade": "g8", "subject": "物理", "name": "初二物理", "questions": [
        {"q":"声音在15℃空气中传播速度约为？","options":["340m/s","3*10⁸m/s","1500m/s","340km/h"],"answer":0,"difficulty":"easy"},
        {"q":"光在真空中的传播速度是？","options":["3*10⁸m/s","340m/s","3*10⁵m/s","3*10⁶m/s"],"answer":0,"difficulty":"easy"},
        {"q":"平面镜成像的特点是？","options":["等大正立虚像","等大倒立实像","放大虚像","缩小实像"],"answer":0,"difficulty":"easy"},
        {"q":"凸透镜对光线的作用是？","options":["会聚","发散","不变","反射"],"answer":0,"difficulty":"easy"},
        {"q":"水的密度是？","options":["1.0*10³kg/m³","1.0g/cm³","1000kg/m³","以上都对"],"answer":3,"difficulty":"easy"},
        {"q":"牛顿第一定律也叫？","options":["惯性定律","万有引力定律","运动定律","能量守恒定律"],"answer":0,"difficulty":"medium"},
        {"q":"液体的压强随深度增加而？","options":["增大","减小","不变","先增大后减小"],"answer":0,"difficulty":"easy"},
        {"q":"浮力的方向总是？","options":["竖直向上","竖直向下","水平","任意方向"],"answer":0,"difficulty":"easy"},
        {"q":"功率的单位是？","options":["瓦特","焦耳","牛顿","帕斯卡"],"answer":0,"difficulty":"easy"},
        {"q":"晶体熔化的特点是？","options":["温度不变持续吸热","温度升高持续吸热","温度不变放热","温度降低放热"],"answer":0,"difficulty":"medium"},
    ]},
    "m_g9_chemistry_q": {"stage": "middle_school", "grade": "g9", "subject": "化学", "name": "初三化学", "questions": [
        {"q":"空气中含量最多的气体是？","options":["氮气","氧气","二氧化碳","稀有气体"],"answer":0,"difficulty":"easy"},
        {"q":"氧气的化学符号是？","options":["O","O₂","O₃","H₂O"],"answer":1,"difficulty":"easy"},
        {"q":"水由什么组成？","options":["氢和氧","氢和氮","氧和碳","氮和氧"],"answer":0,"difficulty":"easy"},
        {"q":"以下哪个是物理变化？","options":["冰融化成水","铁生锈","木炭燃烧","食物腐烂"],"answer":0,"difficulty":"easy"},
        {"q":"元素周期表是由谁发现的？","options":["门捷列夫","道尔顿","拉瓦锡","居里夫人"],"answer":0,"difficulty":"easy"},
        {"q":"pH=7的溶液呈？","options":["中性","酸性","碱性","不确定"],"answer":0,"difficulty":"easy"},
        {"q":"实验室制取氧气不需要的仪器是？","options":["酒精灯","试管","集气瓶","天平"],"answer":3,"difficulty":"medium"},
        {"q":"铁在氧气中燃烧的现象是？","options":["火星四射","发出白光","蓝色火焰","黄色火焰"],"answer":0,"difficulty":"medium"},
        {"q":"盐酸的化学式是？","options":["HCl","H₂SO₄","HNO₃","H₂CO₃"],"answer":0,"difficulty":"easy"},
        {"q":"相对原子质量的单位是？","options":["1","g","kg","mg"],"answer":0,"difficulty":"hard"},
    ]},
})

# ==================== 内容聚合 ====================
def get_all_content() -> Dict:
    return {
        "stages": STAGES,
        "kindergarten_courses": KINDERGARTEN_COURSES,
        "primary_courses": PRIMARY_COURSES,
        "middle_school_courses": MIDDLE_SCHOOL_COURSES,
        "quiz_database": QUIZ_DATABASE,
    }

def get_content_by_stage(stage: str) -> Dict:
    result = {"courses": [], "quizzes": []}
    if stage == "kindergarten":
        result["courses"] = list(KINDERGARTEN_COURSES.values())
        result["quizzes"] = [v for v in QUIZ_DATABASE.values() if v["stage"] == "kindergarten"]
    elif stage == "primary":
        result["courses"] = list(PRIMARY_COURSES.values())
        result["quizzes"] = [v for v in QUIZ_DATABASE.values() if v["stage"] == "primary"]
    elif stage == "middle_school":
        result["courses"] = list(MIDDLE_SCHOOL_COURSES.values())
        result["quizzes"] = [v for v in QUIZ_DATABASE.values() if v["stage"] == "middle_school"]
    return result

def get_stage_summary() -> List[Dict]:
    return [
        {"id": "kindergarten", "name": "育儿园", "course_count": len(KINDERGARTEN_COURSES),
         "quiz_count": sum(1 for v in QUIZ_DATABASE.values() if v["stage"] == "kindergarten"),
         "lesson_count": sum(len(c["lessons"]) for c in KINDERGARTEN_COURSES.values())},
        {"id": "primary", "name": "小学", "course_count": len(PRIMARY_COURSES),
         "quiz_count": sum(1 for v in QUIZ_DATABASE.values() if v["stage"] == "primary"),
         "lesson_count": sum(len(c["lessons"]) for c in PRIMARY_COURSES.values())},
        {"id": "middle_school", "name": "中学", "course_count": len(MIDDLE_SCHOOL_COURSES),
         "quiz_count": sum(1 for v in QUIZ_DATABASE.values() if v["stage"] == "middle_school"),
         "lesson_count": sum(len(c["lessons"]) for c in MIDDLE_SCHOOL_COURSES.values())},
    ]

def get_quiz_by_stage(stage: str, subject: str = None) -> List[Dict]:
    quizzes = [v for v in QUIZ_DATABASE.values() if v["stage"] == stage]
    if subject:
        quizzes = [q for q in quizzes if q.get("subject") == subject]
    return quizzes

def get_stage_for_age(age: int) -> str:
    if age <= 6: return "kindergarten"
    if age <= 12: return "primary"
    return "middle_school"

content_db = type("ContentDB", (), {
    "STAGES": STAGES,
    "KINDERGARTEN_COURSES": KINDERGARTEN_COURSES,
    "PRIMARY_COURSES": PRIMARY_COURSES,
    "MIDDLE_SCHOOL_COURSES": MIDDLE_SCHOOL_COURSES,
    "QUIZ_DATABASE": QUIZ_DATABASE,
    "get_all_content": get_all_content,
    "get_content_by_stage": get_content_by_stage,
    "get_stage_summary": get_stage_summary,
    "get_quiz_by_stage": get_quiz_by_stage,
    "get_stage_for_age": get_stage_for_age,
})

# 欧洲内容注册（替换旧的占位内容）在文件末尾统一处理


# Add quiz sets covering new subjects
QUIZ_DATABASE_EXT = {
    "quiz_programming": {
        "id": "quiz_programming", "name": "编程基础测验", "stage": "primary",
        "subject": "STEM", "difficulty": "beginner",
        "questions": [
            {"id": f"pq_{i}", "question": q, "options": opts, "answer": ans}
            for i, (q, opts, ans) in enumerate([
                ("什么是编程？", ["玩游戏", "给计算机指令", "画画", "听音乐"], 1),
                ("Scratch中用什么来移动角色？", ["声音", "积木块", "颜色", "数字"], 1),
                ("循环的作用是什么？", ["重复执行代码", "停止程序", "计算数字", "显示文字"], 0),
                ("变量可以用来做什么？", ["存储数据", "播放音乐", "画图形", "连接网络"], 0),
                ("条件判断的英文是什么？", ["loop", "if/else", "function", "variable"], 1),
            ])
        ]
    },
    "quiz_robotics": {
        "id": "quiz_robotics", "name": "机器人技术基础", "stage": "middle_school",
        "subject": "STEM", "difficulty": "intermediate",
        "questions": [
            {"id": f"rq_{i}", "question": q, "options": opts, "answer": ans}
            for i, (q, opts, ans) in enumerate([
                ("传感器的作用是什么？", ["感知环境", "移动机器人", "显示信息", "供电"], 0),
                ("什么是执行器？", ["传感器", "电机/舵机", "CPU", "电池"], 1),
                ("Arduino是什么？", ["编程语言", "微控制器板", "操作系统", "传感器"], 1),
                ("PWM信号用于什么？", ["数字通信", "速度控制", "WiFi连接", "数据存储"], 1),
                ("PID控制器的全称是？", ["比例积分微分", "并行输入输出", "电源接口定义", "程序初始化"], 0),
            ])
        ]
    },
    "quiz_ai": {
        "id": "quiz_ai", "name": "人工智能基础", "stage": "middle_school",
        "subject": "STEM", "difficulty": "intermediate",
        "questions": [
            {"id": f"aiq_{i}", "question": q, "options": opts, "answer": ans}
            for i, (q, opts, ans) in enumerate([
                ("机器学习是什么？", ["让计算机从数据中学习", "编写更长的代码", "使用更快的CPU", "增加存储空间"], 0),
                ("神经网络模仿的是什么？", ["人脑结构", "计算机硬件", "数据库", "网络协议"], 0),
                ("训练数据的作用是？", ["教模型识别模式", "存储结果", "显示图像", "连接服务器"], 0),
                ("监督学习需要什么？", ["无标签数据", "带标签数据", "不需要数据", "随机数据"], 1),
                ("什么是深度学习？", ["多层神经网络", "单层网络", "无网络", "硬件加速"], 0),
            ])
        ]
    },
    "quiz_language": {
        "id": "quiz_language", "name": "欧洲语言基础", "stage": "primary",
        "subject": "语言", "difficulty": "beginner",
        "questions": [
            {"id": f"lq_{i}", "question": q, "options": opts, "answer": ans}
            for i, (q, opts, ans) in enumerate([
                ("法语\"Bonjour\"的意思是？", ["再见", "你好", "谢谢", "晚安"], 1),
                ("西班牙语\"Gracias\"的意思是？", ["你好", "再见", "谢谢", "对不起"], 2),
                ("德语\"Danke\"的意思是？", ["是", "不", "谢谢", "请"], 2),
                ("法语\"Merci\"的意思是？", ["你好", "谢谢", "再见", "请"], 1),
                ("西班牙语\"Hola\"的意思是？", ["你好", "再见", "谢谢", "晚安"], 0),
            ])
        ]
    },
}

logger.info(f"Legacy CN content library: {len(KINDERGARTEN_COURSES)} kindergarten, "
            f"{len(PRIMARY_COURSES)} primary, {len(MIDDLE_SCHOOL_COURSES)} middle school courses, "
            f"{len(QUIZ_DATABASE)} quiz sets")


# ==================== 欧洲市场内容库 (the sellable library) ====================
# 产品定位是「欧洲儿童陪护机器人」。上面三套课程是中国国家课程标准内容，
# 在欧洲市场不可售卖（家长不会为孩子订阅「道德与法治/中国历史」）。
# 这里是面向欧洲 3-12 岁的内容库：与年龄带绑定、支持本地语言、无意识形态内容。
#
# 统一 schema（与上面老课程保持一致，修正了 k_ext/p_ext/m_ext 的
# lesson_id/duration 键名不一致问题）：
#   id, title, title_local, lang, content, type, duration_min
EU_AGE_BANDS = {
    "early_years":     {"name": "Early Years (3-6)",
                        "label_de": "Frühe Jahre (3-6)", "ages": (3, 6)},
    "lower_primary":   {"name": "Lower Primary (6-9)",
                        "label_de": "Untere Primarstufe (6-9)", "ages": (6, 9)},
    "upper_primary":   {"name": "Upper Primary (9-12)",
                        "label_de": "Obere Primarstufe (9-12)", "ages": (9, 12)},
}

EU_LANGUAGES = ["en", "de", "fr", "nl", "es", "it"]   # 首发六语

# 欧洲市场可售卖的学科。注意：**不含任何国家的政治/意识形态课程**。
EU_SUBJECTS = [
    "language_literacy",   # 本地语言读写 + 英语启蒙
    "numeracy_logic",      # 数感与逻辑
    "science_nature",      # 自然科学（实验观察）
    "social_emotional",    # 情绪/社交 —— 陪护机器人差异点
    "music_movement",      # 儿歌/律动
    "stories_creativity",  # 故事与创造
    "digital_safety",      # 网络安全（家长最在意的欧盟品类）
]


def _eu_lesson(i, title, content, type_="lesson", mins=15, title_local=None,
               lang="en"):
    return {"id": f"l{i}", "title": title, "title_local": title_local,
            "lang": lang, "content": content, "type": type_,
            "duration_min": mins}


def _eu_course(cid, band, subject, name, name_local, description, market,
               lessons, goals=None):
    return {
        "course_id": cid, "band": band, "subject": subject,
        "name": name, "name_local": name_local, "description": description,
        "market": market, "lessons": lessons, "goals": goals or [],
        "age_range": EU_AGE_BANDS[band]["name"],
    }


EUROPE_COURSES: Dict[str, Dict] = {}

# ── language_literacy: 德语启蒙 (3-6) ──────────────────────────────────────
EUROPE_COURSES["eu_de_phonics"] = _eu_course(
    "eu_de_phonics", "early_years", "language_literacy",
    "German First Sounds", "Deutsch: erste Laute",
    "Letter sounds, first words and simple German phrases for 3-6 year olds.",
    "DE/AT/CH",
    [_eu_lesson(1, "My name is...", "Ich heiße ... - saying your own name",
                "speaking", 15, "Ich heiße", "de"),
     _eu_lesson(2, "The alphabet song", "A-B-C-D: singing the German alphabet",
                "song", 12, "Das Alphabet", "de"),
     _eu_lesson(3, "Colours all around", "red / blue / yellow / green: rot, blau, gelb, grün",
                "game", 15, "Farben", "de"),
     _eu_lesson(4, "Counting to ten", "eins zwei drei vier fünf - numbers 1-10",
                "game", 12, "Zählen bis zehn", "de"),
     _eu_lesson(5, "Animals on the farm", "cat, dog, cow, horse: Katze, Hund, Kuh, Pferd",
                "story", 15, "Tiere auf dem Bauernhof", "de"),
     _eu_lesson(6, "My body", "head, hand, foot: Kopf, Hand, Fuß",
                "movement", 12, "Mein Körper", "de"),
     _eu_lesson(7, "Please and thank you", "bitte and danke - polite words",
                "speaking", 10, "Bitte und danke", "de"),
     _eu_lesson(8, "My family", "mother, father, sister, brother: Mama, Papa, Schwester, Bruder",
                "story", 15, "Meine Familie", "de")],
    ["Hear and repeat German letter sounds",
     "Use 20 everyday German words",
     "Say a full sentence about yourself"])

# ── language_literacy: 法语启蒙 (3-6) ──────────────────────────────────────
EUROPE_COURSES["eu_fr_phonics"] = _eu_course(
    "eu_fr_phonics", "early_years", "language_literacy",
    "French First Sounds", "Français: premiers sons",
    "French letter sounds, first words and nursery rhymes for 3-6 year olds.",
    "FR/BE/LU",
    [_eu_lesson(1, "Hello, my friend", "Bonjour! - greeting someone new",
                "speaking", 12, "Bonjour", "fr"),
     _eu_lesson(2, "The alphabet", "A, B, C in French: ah, bay, say",
                "song", 12, "L'alphabet", "fr"),
     _eu_lesson(3, "Colours", "red / blue / yellow: rouge, bleu, jaune",
                "game", 15, "Les couleurs", "fr"),
     _eu_lesson(4, "Farm animals", "the cat, the dog, the duck: le chat, le chien, le canard",
                "story", 15, "Les animaux", "fr"),
     _eu_lesson(5, "Numbers 1 to 10", "un deux trois quatre cinq",
                "game", 12, "Les nombres", "fr"),
     _eu_lesson(6, "Days of the week", "lundi, mardi, mercredi",
                "song", 12, "Les jours", "fr"),
     _eu_lesson(7, "Weather talk", "it is sunny: il fait beau",
                "speaking", 12, "La météo", "fr"),
     _eu_lesson(8, "A song for me", "Frère Jacques - singing with actions",
                "song", 15, "Frère Jacques", "fr")],
    ["Recognise 26 French letter sounds",
     "Use greetings and polite forms",
     "Sing one French nursery rhyme"])

# ── language_literacy: 荷兰语启蒙 (3-6) ────────────────────────────────────
EUROPE_COURSES["eu_nl_phonics"] = _eu_course(
    "eu_nl_phonics", "early_years", "language_literacy",
    "Dutch First Words", "Nederlands: eerste woorden",
    "Dutch first words and sounds for 3-6 year olds in the Netherlands and Flanders.",
    "NL/BE",
    [_eu_lesson(1, "Hallo!", "Greeting friends and grown-ups",
                "speaking", 10, "Hallo", "nl"),
     _eu_lesson(2, "Colours", "red, blue, yellow: rood, blauw, geel",
                "game", 15, "Kleuren", "nl"),
     _eu_lesson(3, "Counting", "een twee drie vier vijf",
                "game", 12, "Tellen", "nl"),
     _eu_lesson(4, "Animals", "cat, dog, bird: kat, hond, vogel",
                "story", 15, "Dieren", "nl"),
     _eu_lesson(5, "In my house", "kitchen, room, garden: keuken, kamer, tuin",
                "speaking", 12, "In mijn huis", "nl"),
     _eu_lesson(6, "Thank you", "dank je and alstublieft",
                "speaking", 10, "Dank je", "nl")],
    ["Use 15 everyday Dutch words",
     "Answer simple spoken questions",
     "Say thank you and please"])

# ── language_literacy: 英语启蒙 (3-6, EU-wide) ─────────────────────────────
EUROPE_COURSES["eu_en_phonics"] = _eu_course(
    "eu_en_phonics", "early_years", "language_literacy",
    "English Playground", None,
    "English as a second language for 3-6 year olds: sounds, songs, first words.",
    "EU-wide",
    [_eu_lesson(1, "Hello and goodbye", "greetings with actions",
                "speaking", 10, None, "en"),
     _eu_lesson(2, "The ABC song", "letter names a to z",
                "song", 12, None, "en"),
     _eu_lesson(3, "Animals", "dog, cat, duck, sheep",
                "game", 15, None, "en"),
     _eu_lesson(4, "Colours and shapes", "circle, square, triangle",
                "game", 15, None, "en"),
     _eu_lesson(5, "Numbers 1-10", "counting with fingers",
                "game", 12, None, "en"),
     _eu_lesson(6, "My family", "mum, dad, brother, sister",
                "story", 12, None, "en"),
     _eu_lesson(7, "Food I like", "apple, bread, milk - I like / I don't like",
                "speaking", 15, None, "en")],
    ["Recognise the 26 English letter sounds",
     "Use 30 everyday English words",
     "Introduce yourself in English"])

# ── numeracy_logic (3-6) ───────────────────────────────────────────────────
EUROPE_COURSES["eu_num_early"] = _eu_course(
    "eu_num_early", "early_years", "numeracy_logic",
    "Number Sense Start", "Zahlen und Formen",
    "Counting, comparing and shapes for 3-6 year olds - language-independent.",
    "EU-wide",
    [_eu_lesson(1, "How many?", "Counting 1 to 10 with real objects", "game", 15),
     _eu_lesson(2, "More or fewer?", "Comparing two groups", "game", 12),
     _eu_lesson(3, "Shape hunt", "circle, square, triangle at home", "game", 20),
     _eu_lesson(4, "Sorting", "sorting by colour and size", "game", 15),
     _eu_lesson(5, "Patterns", "red-blue-red-blue - what comes next?", "game", 12),
     _eu_lesson(6, "First adding", "1 more, 1 less with blocks", "game", 15)],
    ["Count reliably to 10",
     "Compare two small groups",
     "Name 4 basic shapes"])

# ── numeracy_logic (6-9) ───────────────────────────────────────────────────
EUROPE_COURSES["eu_num_junior"] = _eu_course(
    "eu_num_junior", "lower_primary", "numeracy_logic",
    "Maths Explorers", "Mathe Entdecker",
    "Addition, subtraction, multiplication tables and word problems for 6-9 year olds.",
    "EU-wide",
    [_eu_lesson(1, "Adding to 100", "column addition with carrying", "lesson", 25),
     _eu_lesson(2, "Take away", "subtraction with borrowing", "lesson", 25),
     _eu_lesson(3, "Times tables 2-5", "skip counting and arrays", "game", 20),
     _eu_lesson(4, "Half and quarter", "sharing a pizza fairly", "game", 20),
     _eu_lesson(5, "Money maths", "coins and change in euros", "lesson", 20),
     _eu_lesson(6, "Time and clock", "o'clock and half past", "lesson", 20),
     _eu_lesson(7, "Word problems", "reading a problem, choosing the operation", "exercise", 25),
     _eu_lesson(8, "Puzzles and logic", "what comes next in the sequence?", "game", 20)],
    ["Add and subtract to 100 fluently",
     "Know the 2, 5 and 10 times tables",
     "Solve a one-step word problem"])

# ── science_nature (3-6) ───────────────────────────────────────────────────
EUROPE_COURSES["eu_sci_early"] = _eu_course(
    "eu_sci_early", "early_years", "science_nature",
    "Little Scientists", "Kleine Forscher",
    "Observing nature and safe home experiments for 3-6 year olds.",
    "EU-wide",
    [_eu_lesson(1, "Seeds and sprouts", "plant a bean and watch it grow", "experiment", 20),
     _eu_lesson(2, "Sink or float", "what sinks in the washing-up bowl?", "experiment", 20),
     _eu_lesson(3, "Rainbows", "sun plus water makes a rainbow", "experiment", 15),
     _eu_lesson(4, "Minibeasts", "ladybird, snail, worm - look, let live", "observation", 20),
     _eu_lesson(5, "Day and night", "why the sun goes away", "story", 15),
     _eu_lesson(6, "Weather watch", "sun, cloud, rain, snow - dress for it", "observation", 15)],
    ["Ask a question and test it",
     "Care for a growing plant",
     "Name 5 common minibeasts"])

# ── science_nature (6-9) ───────────────────────────────────────────────────
EUROPE_COURSES["eu_sci_junior"] = _eu_course(
    "eu_sci_junior", "lower_primary", "science_nature",
    "Science Detectives", "Wissenschaft Detektive",
    "Materials, magnetism and the human body for 6-9 year olds.",
    "EU-wide",
    [_eu_lesson(1, "Magnets", "attract and repel - what sticks?", "experiment", 25),
     _eu_lesson(2, "Water changes", "solid, liquid, gas", "experiment", 25),
     _eu_lesson(3, "Sound", "making sound with different materials", "experiment", 25),
     _eu_lesson(4, "Shadows", "what makes a shadow longer?", "experiment", 20),
     _eu_lesson(5, "Electricity basics", "a safe circuit lights a bulb", "experiment", 30),
     _eu_lesson(6, "My body", "heart, lungs, bones", "lesson", 20),
     _eu_lesson(7, "Careful measuring", "millilitres and grams with kitchen tools", "experiment", 25)],
    ["Run a fair test and record it",
     "Explain one material property",
     "Measure volume and mass safely"])

# ── social_emotional (3-6) —— 陪护机器人的差异点 ───────────────────────────
EUROPE_COURSES["eu_social_early"] = _eu_course(
    "eu_social_early", "early_years", "social_emotional",
    "My Feelings Friend", "Meine Gefühle",
    "Naming feelings, kindness and calming down - the core of companion play.",
    "EU-wide",
    [_eu_lesson(1, "Happy, sad, cross", "naming three feelings", "speaking", 15),
     _eu_lesson(2, "When I feel angry", "three big breaths and count to five", "movement", 12),
     _eu_lesson(3, "Sharing is caring", "taking turns with a toy", "roleplay", 15),
     _eu_lesson(4, "Saying sorry", "what a real sorry looks like", "roleplay", 15),
     _eu_lesson(5, "Helping at home", "one small job I can do", "speaking", 15),
     _eu_lesson(6, "Meeting someone new", "being brave and kind", "roleplay", 15),
     _eu_lesson(7, "Safe grown-ups", "who can help me when I need it", "speaking", 12)],
    ["Name 6 feelings",
     "Use one calming strategy alone",
     "Take turns without a reminder"])

# ── social_emotional (6-9) ─────────────────────────────────────────────────
EUROPE_COURSES["eu_social_junior"] = _eu_course(
    "eu_social_junior", "lower_primary", "social_emotional",
    "Growing Kindness", "Freundlich stark",
    "Friendship, fairness and handling worries for 6-9 year olds.",
    "EU-wide",
    [_eu_lesson(1, "What makes a friend?", "listening and trust", "discussion", 20),
     _eu_lesson(2, "Fair or not fair?", "rules in a game", "discussion", 20),
     _eu_lesson(3, "The worry box", "saying a worry out loud", "speaking", 15),
     _eu_lesson(4, "Being left out", "how to invite someone in", "roleplay", 20),
     _eu_lesson(5, "Mistakes are ok", "trying again", "discussion", 15),
     _eu_lesson(6, "Telling the truth", "honesty and repair", "roleplay", 20)],
    ["Describe what makes a good friend",
     "Use two ways to handle a worry",
     "Repair a mistake with someone"])

# ── music_movement (3-6) ───────────────────────────────────────────────────
EUROPE_COURSES["eu_music_early"] = _eu_course(
    "eu_music_early", "early_years", "music_movement",
    "Songs and Movement", "Lieder und Bewegung",
    "European nursery rhymes with actions for 3-6 year olds.",
    "EU-wide",
    [_eu_lesson(1, "Twinkle, Twinkle", "singing with hand stars", "song", 10),
     _eu_lesson(2, "Head, Shoulders", "the body song with actions", "song", 10),
     _eu_lesson(3, "If You're Happy", "clapping and stomping", "song", 10),
     _eu_lesson(4, "The Wheels on the Bus", "round song in a circle", "song", 12),
     _eu_lesson(5, "Row, Row, Row Your Boat", "rhythm with a partner", "song", 10),
     _eu_lesson(6, "Sleep, Baby, Sleep", "a lullaby and a calm ending", "song", 10)],
    ["Sing 6 nursery rhymes with actions",
     "Keep a steady beat",
     "End a session calm"])

# ── stories_creativity (3-6) ───────────────────────────────────────────────
EUROPE_COURSES["eu_stories_early"] = _eu_course(
    "eu_stories_early", "early_years", "stories_creativity",
    "Story Time", "Geschichtenzeit",
    "Classic European picture-book stories and retelling for 3-6 year olds.",
    "EU-wide",
    [_eu_lesson(1, "The Very Hungry Caterpillar", "days of the week and food", "story", 15),
     _eu_lesson(2, "The Little Prince - Rose", "caring for something small", "story", 15),
     _eu_lesson(3, "Pippi Longstocking", "a strong, kind girl", "story", 20),
     _eu_lesson(4, "The Snow Queen", "Gerda and Kai", "story", 20),
     _eu_lesson(5, "Make your own ending", "changing how a story ends", "creative", 20),
     _eu_lesson(6, "Puppet theatre", "retelling with a sock puppet", "creative", 25)],
    ["Retell one story in order",
     "Name the characters' feelings",
     "Invent a new ending"])

# ── stories_creativity (6-9) ───────────────────────────────────────────────
EUROPE_COURSES["eu_stories_junior"] = _eu_course(
    "eu_stories_junior", "lower_primary", "stories_creativity",
    "Young Writers", "Junge Autoren",
    "Reading for pleasure and first creative writing for 6-9 year olds.",
    "EU-wide",
    [_eu_lesson(1, "The Little Prince - a letter", "writing to a friend", "writing", 25),
     _eu_lesson(2, "A diary entry", "one day in my own words", "writing", 25),
     _eu_lesson(3, "Describing a place", "using the five senses", "writing", 25),
     _eu_lesson(4, "A story plan", "beginning, middle, end", "writing", 25),
     _eu_lesson(5, "Poems about weather", "short rhyming lines", "poem", 20),
     _eu_lesson(6, "Reading aloud", "expression and pace", "reading", 20)],
    ["Plan and write a short story",
     "Describe a place with detail",
     "Read a short text aloud with expression"])

# ── digital_safety (6-9) —— 家长付费的最强动机 ─────────────────────────────
EUROPE_COURSES["eu_digital_safety"] = _eu_course(
    "eu_digital_safety", "lower_primary", "digital_safety",
    "Safe and Smart Online", "Sicher im Netz",
    "Age-appropriate online safety for 6-9 year olds: passwords, kindness, telling a grown-up.",
    "EU-wide",
    [_eu_lesson(1, "Private means private", "name, school, address stay offline", "lesson", 20),
     _eu_lesson(2, "Kind words only", "being kind behind a screen", "discussion", 20),
     _eu_lesson(3, "Is this true?", "spotting a made-up story", "lesson", 20),
     _eu_lesson(4, "Strangers online", "not answering unknown messages", "roleplay", 20),
     _eu_lesson(5, "Screen balance", "taking turns with the screen", "discussion", 15),
     _eu_lesson(6, "Tell a grown-up", "what to do when something feels wrong", "roleplay", 20)],
    ["Keep 3 kinds of personal data private",
     "Recognise a kind message",
     "Know who to tell when worried"])

# ── digital_safety (9-12) ──────────────────────────────────────────────────
EUROPE_COURSES["eu_digital_safety_jr"] = _eu_course(
    "eu_digital_safety_jr", "upper_primary", "digital_safety",
    "Your Data, Your Rights", "Deine Daten, deine Rechte",
    "What the robot and apps collect, and the GDPR rights a child actually has.",
    "EU-wide",
    [_eu_lesson(1, "What is personal data?", "name, photo, location, messages", "lesson", 25),
     _eu_lesson(2, "Cookies and trackers", "why sites remember you", "lesson", 25),
     _eu_lesson(3, "Your GDPR rights", "access, correction, deletion", "lesson", 25),
     _eu_lesson(4, "Deepfakes and fakes", "seeing a fake photo or voice", "lesson", 25),
     _eu_lesson(5, "Time well spent", "tracking my own screen time", "activity", 25),
     _eu_lesson(6, "Asking for help", "reporting and blocking", "roleplay", 20)],
    ["List 5 types of personal data",
     "Explain deletion right in own words",
     "Report and block a message"])


# 每个市场的默认课程包（上架/推荐直接用这个）
EU_MARKET_PACKAGES: Dict[str, Dict] = {
    "DE": {"name": "Deutschland", "languages": ["de", "en"],
           "courses": ["eu_de_phonics", "eu_num_early", "eu_social_early",
                       "eu_music_early", "eu_sci_early", "eu_stories_early",
                       "eu_digital_safety", "eu_num_junior", "eu_sci_junior",
                       "eu_social_junior", "eu_stories_junior", "eu_digital_safety_jr"]},
    "FR": {"name": "France", "languages": ["fr", "en"],
           "courses": ["eu_fr_phonics", "eu_num_early", "eu_social_early",
                       "eu_music_early", "eu_sci_early", "eu_stories_early",
                       "eu_digital_safety", "eu_num_junior", "eu_sci_junior",
                       "eu_social_junior", "eu_stories_junior", "eu_digital_safety_jr"]},
    "NL": {"name": "Nederland", "languages": ["nl", "en"],
           "courses": ["eu_nl_phonics", "eu_num_early", "eu_social_early",
                       "eu_music_early", "eu_sci_early", "eu_stories_early",
                       "eu_digital_safety", "eu_num_junior", "eu_sci_junior",
                       "eu_social_junior", "eu_stories_junior", "eu_digital_safety_jr"]},
    "*":  {"name": "EU-wide", "languages": ["en"],
           "courses": sorted(EUROPE_COURSES)},
}


def get_eu_course(course_id: str) -> Optional[Dict]:
    return EUROPE_COURSES.get(course_id)


def get_eu_courses(band: str = None, subject: str = None,
                   market: str = None) -> List[Dict]:
    out = []
    for c in EUROPE_COURSES.values():
        if band and c["band"] != band:
            continue
        if subject and c["subject"] != subject:
            continue
        if market and market != "*" and c["market"] != market:
            continue
        out.append(c)
    return sorted(out, key=lambda c: c["course_id"])


def get_eu_band_for_age(age: int) -> str:
    """3-6 -> early_years, 6-9 -> lower_primary, 9-12 -> upper_primary."""
    if age < 6:
        return "early_years"
    if age < 9:
        return "lower_primary"
    return "upper_primary"


def eu_lesson_schema_check() -> Dict[str, Any]:
    """Guard: every EU lesson must use the same keys as the legacy courses."""
    bad = []
    for cid, c in EUROPE_COURSES.items():
        for lsn in c["lessons"]:
            for key in _SCHEMA_KEYS:
                if key not in lsn:
                    bad.append(f"{cid}/{lsn.get('id','?')} missing {key}")
    return {"ok": not bad, "bad": bad, "courses": len(EUROPE_COURSES),
            "lessons": sum(len(c["lessons"]) for c in EUROPE_COURSES.values())}


# ==================== 欧洲内容注册 + schema 归一 ====================
# 上面已删除的 k_ext_*/p_ext_*/m_ext_* 是模板占位内容
# （“自然探索 - 第1课”，lesson_id/duration 键名与其它课程不一致）：
# 在欧洲市场既不可售卖，又是 phase_ingest 实际采集并上架的东西。
# 现在统一使用 EUROPE_COURSES，并把遗留课程的 lesson 键名归一。

_SCHEMA_KEYS = ("id", "title", "content", "type", "duration_min")


def _normalise_lesson_keys(course_map) -> int:
    fixed = 0
    for course in course_map.values():
        for lsn in course.get("lessons", []):
            if "lesson_id" in lsn and "id" not in lsn:
                lsn["id"] = lsn.pop("lesson_id")
                fixed += 1
            if "duration" in lsn and "duration_min" not in lsn:
                lsn["duration_min"] = lsn.pop("duration")
                fixed += 1
    return fixed


SCHEMA_FIXED = (_normalise_lesson_keys(KINDERGARTEN_COURSES) +
                _normalise_lesson_keys(PRIMARY_COURSES) +
                _normalise_lesson_keys(MIDDLE_SCHOOL_COURSES))

# 欧盟课程按年龄带挂进既有 stage 视图（early_years -> kindergarten，
# lower/upper_primary -> primary），旧 age/stage 查询路径也能看到欧洲内容。
for _cid, _c in EUROPE_COURSES.items():
    (_target := KINDERGARTEN_COURSES if _c["band"] == "early_years"
               else PRIMARY_COURSES)[_cid] = _c

EU_MARKETS = [
    {"code": "DE", "name": "Deutschland", "currency": "EUR", "vat": 0.19},
    {"code": "FR", "name": "France", "currency": "EUR", "vat": 0.20},
    {"code": "NL", "name": "Nederland", "currency": "EUR", "vat": 0.21},
]


def lessons_schema_ok(course_map) -> bool:
    """Guard: every lesson in the map uses the unified schema."""
    return all(all(k in l for k in _SCHEMA_KEYS)
               for c in course_map.values() for l in c.get("lessons", []))


def get_market_package(market: str) -> Dict[str, Any]:
    """Default sellable package for a market, with resolved courses."""
    pkg = EU_MARKET_PACKAGES.get(market) or EU_MARKET_PACKAGES["*"]
    return {"market": market, "name": pkg["name"], "languages": pkg["languages"],
            "courses": [EUROPE_COURSES[c] for c in pkg["courses"]
                        if c in EUROPE_COURSES],
            "lesson_count": sum(len(EUROPE_COURSES[c]["lessons"])
                                for c in pkg["courses"] if c in EUROPE_COURSES)}


# 让 content_db 单例也暴露欧洲库（旧的 type() 工厂实例补字段）
for _name, _val in {
    "EUROPE_COURSES": EUROPE_COURSES,
    "EU_AGE_BANDS": EU_AGE_BANDS,
    "EU_SUBJECTS": EU_SUBJECTS,
    "EU_LANGUAGES": EU_LANGUAGES,
    "EU_MARKET_PACKAGES": EU_MARKET_PACKAGES,
    "EU_MARKETS": EU_MARKETS,
    "get_eu_course": get_eu_course,
    "get_eu_courses": get_eu_courses,
    "get_eu_band_for_age": get_eu_band_for_age,
    "get_market_package": get_market_package,
    "eu_lesson_schema_check": eu_lesson_schema_check,
    "lessons_schema_ok": lessons_schema_ok,
}.items():
    setattr(content_db, _name, _val)

logger.info(f"EU content library registered: {len(EUROPE_COURSES)} courses / "
            f"{sum(len(c['lessons']) for c in EUROPE_COURSES.values())} lessons "
            f"(schema normalised on {SCHEMA_FIXED} legacy lessons)")
