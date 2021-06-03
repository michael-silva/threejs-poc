class GlobalSingleton {
  setInitial(data) {
    Object.assign(this, data);
  }
}

const globals = new GlobalSingleton();
export default globals;
