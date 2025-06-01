export class StorageService {
  async setItem<T>(key: string, value: T): Promise<void> {
    if (!value) {
      return this.removeItem(key)
    }

    localStorage.setItem(key, JSON.stringify(value))
  }

  async getItem<T>(key: string): Promise<T | null> {
    const data = localStorage.getItem(key)
    if (!data) {
      return null
    }

    try {
      const res = JSON.parse(data)

      return res
    } catch {
      return null
    }
  }

  async removeItem(key: string) {
    localStorage.removeItem(key)
  }
}
