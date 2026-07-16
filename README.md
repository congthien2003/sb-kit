# sb-kit

CLI để cài các skill vào cả `.agents/skills` và `.claude/skills` của project.

## Cài đặt

Chạy trong project cần sử dụng skill:

```bash
npx sb-kit install
```

Sau đó chọn một nhóm:

1. **All** — toàn bộ skill trong package.
2. **sb-kit only** — `sk-excute` và `sk-visualizer`.
3. **Other skills only** — các skill còn lại ngoài sb-kit.

Skill đã tồn tại ở một trong hai thư mục sẽ được giữ nguyên và báo là `Skipped`.

## Sử dụng

```bash
npx sb-kit --help
```

## sb-kit skills

### `sk-excute`

Quy trình triển khai task có kiểm soát: tạo spec, lập implementation plan, chờ approval rồi mới chỉnh sửa code.

### `sk-visualizer`

Chuyển prompt, spec, plan hoặc nội dung hội thoại thành một file HTML visualization dễ đọc.

## License

ISC
