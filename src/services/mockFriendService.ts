import { FriendInfo, FriendDiaryEntry, storage } from "./storage";

const MOCK_FRIENDS: FriendInfo[] = [
  {
    id: "friend_001",
    nickname: "林深时见鹿",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    catName: "年糕",
    catAvatar: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=200&h=200&auto=format&fit=crop",
    addedAt: Date.now() - 86400000 * 5,
  },
  {
    id: "friend_002",
    nickname: "夏天的风",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Summer",
    catName: "芝士",
    catAvatar: "https://images.unsplash.com/photo-1573865662567-57ef5b67bfd7?q=80&w=200&h=200&auto=format&fit=crop",
    addedAt: Date.now() - 86400000 * 3,
  },
  {
    id: "friend_003",
    nickname: "半糖主义",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sugar",
    catName: "布丁",
    catAvatar: "https://images.unsplash.com/photo-1533733506391-7f077ca1ca09?q=80&w=200&h=200&auto=format&fit=crop",
    addedAt: Date.now() - 86400000 * 1,
  }
];

const MOCK_DIARIES: FriendDiaryEntry[] = [
  {
    id: "fdiary_001_1",
    catId: "mock_cat_001",
    authorId: "friend_001",
    authorNickname: "林深时见鹿",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    catName: "年糕",
    content: "年糕今天第一次学会了开抽屉，真是个小机灵鬼（虽然把里面的零食都翻出来了...）",
    media: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop",
    mediaType: "image",
    createdAt: Date.now() - 3600000 * 2,
    likes: 24,
    isLiked: false,
    comments: [
      { id: "c_1", content: "哈哈，年糕太聪明了！" },
      { id: "c_2", content: "我家主子也爱翻抽屉，头疼。" }
    ]
  },
  {
    id: "fdiary_002_1",
    catId: "mock_cat_002",
    authorId: "friend_002",
    authorNickname: "夏天的风",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Summer",
    catName: "芝士",
    content: "午后的阳光洒在芝士身上，金灿灿的，这一刻感觉时间都慢下来了。这就是陪伴的意义吧。✨",
    media: "https://images.unsplash.com/photo-1573865662567-57ef5b67bfd7?q=80&w=800&auto=format&fit=crop",
    mediaType: "image",
    createdAt: Date.now() - 3600000 * 5,
    likes: 56,
    isLiked: true,
    comments: [
      { id: "c_3", content: "好温馨的画面，治愈了。" }
    ]
  },
  {
    id: "fdiary_003_1",
    catId: "mock_cat_003",
    authorId: "friend_003",
    authorNickname: "半糖主义",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sugar",
    catName: "布丁",
    content: "布丁今天居然主动跳到我腿上睡觉了！平时可是个高冷的小公举，今天太阳打西边出来了？☀️",
    media: "https://images.unsplash.com/photo-1533733506391-7f077ca1ca09?q=80&w=800&auto=format&fit=crop",
    mediaType: "image",
    createdAt: Date.now() - 3600000 * 12,
    likes: 89,
    isLiked: false,
    comments: []
  },
  {
    id: "fdiary_001_2",
    catId: "mock_cat_001",
    authorId: "friend_001",
    authorNickname: "林深时见鹿",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    catName: "年糕",
    content: "新买的猫爬架到了，年糕看起来很满意，已经在最高层巡视领地了。🏰",
    media: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?q=80&w=800&auto=format&fit=crop",
    mediaType: "image",
    createdAt: Date.now() - 86400000 * 2,
    likes: 42,
    isLiked: false,
    comments: []
  }
];

export const mockFriendService = {
  /**
   * 初始化 Mock 数据到本地存储
   * 仅当本地没有好友数据时执行，避免覆盖用户真实添加的好友
   */
  initializeMockData: () => {
    const existingFriends = storage.getFriends();
    if (existingFriends.length === 0) {
      MOCK_FRIENDS.forEach(friend => storage.addFriend(friend));
      
      // 覆盖 addFriend 自动生成的简单 mock，使用更丰富的 mock 数据
      const currentFriendDiaries = storage.getFriendDiaries();
      const combinedDiaries = [...MOCK_DIARIES];
      
      // 确保 ID 不重复
      const uniqueDiaries = combinedDiaries.filter((diary, index, self) =>
        index === self.findIndex((t) => t.id === diary.id)
      );
      
      storage.saveFriendDiaries(uniqueDiaries);
      return true;
    }
    return false;
  },

  getMockFriends: () => MOCK_FRIENDS,
  getMockDiaries: () => MOCK_DIARIES
};
