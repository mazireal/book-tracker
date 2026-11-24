# ردیاب کتاب | Book Tracker

اپ وب موبایل‌محور برای ردیابی کتاب‌هایی که خوانده‌ای — مثل Bingers و Sofa Time برای فیلم، ولی برای کتاب.

## امکانات

- **جستجوی کتاب** بر اساس عنوان یا نویسنده، فارسی یا انگلیسی — با جلد کتاب، از [Open Library](https://openlibrary.org) (رایگان، بدون نیاز به کلید)
- **سه قفسه:** خوانده‌ام / در حال خواندن / می‌خواهم بخوانم
- **امتیاز ۵ ستاره** برای هر کتاب (ضربه دوباره روی همان ستاره، امتیاز را پاک می‌کند)
- **یادداشت و نقد شخصی** برای هر کتاب، با ذخیره خودکار
- **تاریخ خواندن** (اختیاری) و امکان ویرایش قفسه و حذف کتاب
- **آمار:** تعداد کتاب‌های خوانده‌شده، میانگین امتیاز، کتاب‌های در حال خواندن
- **پشتیبان‌گیری:** خروجی و بازیابی JSON
- رابط کاربری فارسی و راست‌به‌چپ، موبایل‌محور

## اجرا

بدون هیچ وابستگی و بدون بیلد — فقط یک پروژه استاتیک است:

```bash
# روش ۱: باز کردن مستقیم فایل
open index.html

# روش ۲: سرور استاتیک ساده
python3 -m http.server 8000
# بعد در مرورگر: http://localhost:8000
```

روی GitHub Pages هم قابل انتشار است (Settings → Pages → Deploy from branch).

## داده‌ها کجا ذخیره می‌شوند؟

همه داده‌ها (کتاب‌ها، امتیازها، یادداشت‌ها) فقط در `localStorage` مرورگر خودت ذخیره می‌شوند و به هیچ سروری فرستاده نمی‌شوند. فقط جستجو و جلد کتاب‌ها از Open Library می‌آید. برای اطمینان، هر از گاهی از دکمه «خروجی پشتیبان» استفاده کن.

## ساختار پروژه

```
index.html   # ساختار صفحه
style.css    # استایل‌ها (موبایل‌محور، راست‌به‌چپ)
app.js       # منطق برنامه: جستجو، قفسه‌ها، امتیاز، یادداشت، آمار
```

## مجوز

MIT — فایل [LICENSE](LICENSE) را ببین.

---

## English summary

A mobile-first, Persian (RTL) web app for tracking books you've read — like Bingers / Sofa Time, but for books. Search books by title or author (Persian or English) via the free Open Library API, add them to shelves (Read / Currently reading / Want to read), rate them with 5 stars, write personal notes/reviews, and see reading stats. All data lives in the browser's `localStorage`; no backend, no build step — just open `index.html` or serve it statically. MIT licensed.
