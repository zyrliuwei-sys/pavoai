#!/usr/bin/env python3
"""PavoAI brand copy revision: em-dash purge, SEO keywords, guide section."""
import json

EN = {
  "common.metadata.title": "Free AI Video Generator, Text to Video AI | PavoAI",
  "common.metadata.description": "PavoAI turns text and photos into video with 20+ top models. Free AI video generator for text to video, image to video, AI editing, avatars and music. 25 free credits, 4K, no watermark.",

  "lp.hero.eyebrow": "AI video generator",
  "lp.hero.subtitle": "A free AI video generator for text to video, image to video and AI editing, with Veo, Kling, Sora and 20+ more models in one studio. Pay once, credits never expire.",

  "lp.new.c1_desc": "Google's fastest video model, 1080p clips in under 30 seconds.",
  "lp.new.c2_desc": "Cinematic camera control and longer takes, up to 2 minutes.",
  "lp.new.c3_desc": "A scene-based editor that keeps characters consistent across shots.",
  "lp.new.c4_desc": "Product photo in, UGC-style video ad out, from one prompt.",

  "lp.cmp.sub": "Video generators, editors, avatar and music tools, each with its own subscription. PavoAI replaces them all with one login and one balance.",

  "lp.gal.sub": "Every frame below came out of a single prompt. No camera, no crew, no edit.",
  "lp.uc.sub": "Eight studios, one credit balance. Pick a lane and start rolling.",
  "lp.how.s1d": "Video, image, avatar or music, or just chat.",

  "lp.faq.a1": "PavoAI is an all-in-one AI video generator. Describe what you want, or upload a photo, then generate videos, images, avatars, music and voice with 20+ leading models, and edit and download without leaving the studio.",
  "lp.faq.a5": "Trim and arrange takes in the editor, restyle a clip, upscale to 4K, add subtitles in 98 languages or dub into 33, all without leaving the studio.",
  "lp.faq.a8": "Each model has its own strengths: Veo for realism, Kling for camera work, Sora for creative range. If unsure, start with the default; you can compare takes side by side.",

  "lp.blog.p1x": "We generated 60 identical prompts on both models. Here is when each one wins.",
  "lp.blog.p2x": "Camera, light, motion, mood: the four-part formula behind clips that don't look AI-generated.",
  "lp.blog.p3x": "Creator-style ads from one product photo. Copy the prompts and go.",

  "lp.footer.desc": "PavoAI is an AI video generator that turns a sentence into a finished video: generation, editing and publishing in one studio.",

  # SEO long-form guide section
  "lp.guide.label": "Why PavoAI",
  "lp.guide.title": "An AI video generator built for people who ship",
  "lp.guide.intro": "Most AI video tools do one thing well and stop there. PavoAI puts the whole pipeline in one place, so an idea can go from prompt to published clip without a subscription stack or a render farm.",
  "lp.guide.b1t": "Text to video, from one sentence",
  "lp.guide.b1": "Type what you want to see and press create. The text to video studio runs your prompt on Veo, Kling, Sora and 20+ more models, so you can compare takes, pick the winner and iterate until the shot is right. Script a scene, describe a product spin, or storyboard a whole ad in an afternoon.",
  "lp.guide.b2t": "Image to video that keeps your subject",
  "lp.guide.b2": "Upload a photo and the image to video studio animates it: a product turntable from one packshot, a talking avatar from a portrait, a cinematic push-in from a still. Reference locking carries character and product details across shots, which is what makes multi-scene videos usable for real campaigns.",
  "lp.guide.b3t": "An AI video editor in the same window",
  "lp.guide.b3": "Generation is half the job. The editor trims and arranges takes, restyles footage, upscales to 4K, writes and burns subtitles in 98 languages, dubs voices in 33, and scores the cut with generated music. Exports carry no watermark and are licensed for commercial use.",
  "lp.guide.b4t": "Built for marketers and creators",
  "lp.guide.b4": "Teams use PavoAI as their AI video maker for ads, social clips, product pages and pitch videos. Start with 25 free credits and no card; top up once, from $15, when a project needs volume. Credits never expire, so the balance you buy this quarter still ships next quarter.",
}

ZH = {
  "common.metadata.title": "免费 AI 视频生成器,文生视频 | PavoAI",
  "common.metadata.description": "PavoAI 用 Veo、Kling、Sora 等 20+ 模型把文字和照片变成视频:文生视频、图生视频、AI 剪辑、数字人、配乐一站完成。25 免费积分,4K 无水印,可商用。",

  "lp.hero.eyebrow": "AI 视频生成器",
  "lp.hero.subtitle": "免费 AI 视频生成器:文生视频、图生视频、AI 剪辑,一个工作室装下 Veo、Kling、Sora 等 20+ 模型。一次付费,积分永不过期。",

  "lp.new.c1_desc": "Google 最快的视频模型,30 秒内出 1080p 短片。",
  "lp.new.c2_desc": "电影级运镜与更长镜头,最长 2 分钟。",
  "lp.new.c3_desc": "分场景编辑器,让角色在不同镜头间保持一致。",
  "lp.new.c4_desc": "一张产品图进,一条 UGC 风格视频广告出。",

  "lp.cmp.sub": "视频生成、剪辑、数字人、音乐,每个工具都要一份订阅。PavoAI 一个账号、一份余额,全部搞定。",

  "lp.gal.sub": "下面每一帧都来自一句提示词:没有摄像机,没有剧组,没有剪辑。",
  "lp.uc.sub": "八大场景,一份积分。选一个,开拍。",
  "lp.how.s1d": "视频、图片、数字人或音乐,或者直接对话。",

  "lp.faq.a1": "PavoAI 是一站式 AI 视频生成器。输入描述或上传照片,用 20+ 顶尖模型生成视频、图片、数字人、音乐和配音,再剪辑、下载,全程不用离开工作室。",
  "lp.faq.a5": "剪辑器里修剪拼接镜头、给素材换风格、增强到 4K、加 98 种语言的字幕、配音 33 种语言,全程不用离开工作室。",
  "lp.faq.a8": "各有所长:Veo 擅长写实,Kling 擅长运镜,Sora 擅长创意。拿不准就用默认模型,还能并排对比多个版本。",

  "lp.blog.p1x": "我们用 60 条相同提示词在两个模型上生成对比,这是各自的胜负手。",
  "lp.blog.p2x": "机位、光线、运动、情绪,四段式公式,让片子不像 AI 生成的。",
  "lp.blog.p3x": "一张产品图变成创作者风格广告,复制提示词直接用。",

  "lp.footer.desc": "PavoAI 把一句话变成一支成片:生成、剪辑、发布,一个工作室完成。",

  "lp.guide.label": "为什么选 PavoAI",
  "lp.guide.title": "为真正要出片的人做的 AI 视频生成器",
  "lp.guide.intro": "大多数 AI 视频工具只做好一件事就停下了。PavoAI 把整条流程放进一个工作室:从提示词到发布成片,不需要一堆订阅,也不需要渲染农场。",
  "lp.guide.b1t": "文生视频,一句话开拍",
  "lp.guide.b1": "输入想要的画面,点击创作。文生视频工作室会用 Veo、Kling、Sora 等 20+ 模型跑你的提示词,对比多个版本,留下最好的那条继续打磨。写一场戏、做一个产品旋转展示,或者一下午把一支广告的分镜全部出完。",
  "lp.guide.b2t": "图生视频,主体不走形",
  "lp.guide.b2": "上传一张照片,图生视频工作室让它动起来:一张包装图变产品转盘,一张人像变开口说话的数字人,一张静帧变电影感推镜。参考锁定让角色和产品细节跨镜头保持一致,多场景视频才真正能用在正式投放里。",
  "lp.guide.b3t": "同一个窗口里的 AI 剪辑器",
  "lp.guide.b3": "生成只是一半。剪辑器修剪拼接镜头、给素材换风格、增强到 4K、写并压制 98 种语言的字幕、33 种语言配音,再用生成的配乐给成片收尾。导出无水印,授权商用。",
  "lp.guide.b4t": "为营销人和创作者而做",
  "lp.guide.b4": "团队把 PavoAI 当作广告、社交短视频、产品页和提案视频的 AI 视频工具。25 免费积分开跑,不用绑卡;需要量的时候 $15 起一次性充值。积分永不过期,这季度买的余额,下季度照样出片。",
}

DASHES = "—–"  # em-dash, en-dash

for path, add in (("messages/en.json", EN), ("messages/zh.json", ZH)):
    data = json.load(open(path, encoding="utf-8"))
    data.update(add)
    # em/en-dash purge across marketing namespaces
    offenders = []
    for k, v in data.items():
        if not isinstance(v, str):
            continue
        if k.startswith(("lp.", "common.metadata.", "landing.")) and any(d in v for d in DASHES):
            offenders.append(k)
            data[k] = v.replace(" — ", ", ").replace("—", ", ").replace(" – ", "-").replace("–", "-").replace("——", ",")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(path, "updated; dash-purged keys:", len(offenders), offenders[:8])
